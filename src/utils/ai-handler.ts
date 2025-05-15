import { OpenAI } from "openai";
import Anthropic from "@anthropic-ai/sdk";
import systemPrompt from "../prompts/system.js";
import { markdownToJson } from "./element-handler.js";
import { InferenceClient } from "@huggingface/inference";
import { AiProviderNameOptions } from "../types/options.js";

interface AITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

interface AIToolMessage {
  role: "user" | "system";
  content: string;
}

interface AIToolResponse {
  toolName: string;
  reasoning?: string;
  parameters: Record<string, any>;
}

/**
 * AI Inference Service
 *
 * This service handles the interaction with the AI to determine the appropriate tools
 * to use based on the user's query
 */
export class AIService {
  private model: string = "gpt-3.5-turbo";
  private systemPrompt: string = systemPrompt;
  private static instance: AIService | null = null;
  private static serverInitialized: boolean = false;
  private provider: AiProviderNameOptions = "openai";
  private client: OpenAI | InferenceClient | Anthropic | null = null;
  private availableTools: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  }[] = [];

  /**
   * Private constructor to prevent direct instantiation
   * Use getInstance() method instead
   */
  private constructor() {}

  /**
   * Get the singleton instance of AIService
   * @returns The singleton AIService instance
   */
  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Initialize the AI service with an API key and optionally set the model
   * This should ONLY be called from the server side
   * @param apiKey AI provider API key (required)
   * @param provider AI provider name (defaults to openai)
   * @param model Optional model to use (defaults to gpt-3.5-turbo)
   */
  initialize(
    apiKey: string,
    provider: AiProviderNameOptions = "openai",
    model?: string
  ): void {
    if (AIService.serverInitialized) {
      console.warn("AIService has already been initialized by the server.");
      return;
    }

    this.provider = provider;
    if (model) this.model = model;

    switch (this.provider) {
      case "openai":
        this.client = new OpenAI({
          apiKey,
          baseURL: "https://openrouter.ai/api/v1",
        });
        break;
      case "anthropic":
        this.client = new Anthropic({ apiKey });
        break;
      case "huggingface":
        this.client = new InferenceClient(apiKey);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${this.provider}`);
    }
    AIService.serverInitialized = true;
  }

  /**
   * Set the available tools that can be used by the AI
   * @param tools Array of tools with name, description, and parameters
   */
  setAvailableTools(
    tools: {
      name: string;
      description: string;
      parameters: Record<string, any>;
    }[]
  ): void {
    this.availableTools = tools;
    this.setSystemPrompt(
      this.systemPrompt.replace(
        "MCP_TOOLS",
        JSON.stringify(this.availableTools, null, 2)
      )
    );
  }

  ensureInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * Get tool definitions for the AI from the available tools
   * @param toolNames Optional array of tool names to filter by (if not provided, all tools will be included)
   * @returns Array of tool definitions
   */
  private getToolDefinitions(toolNames?: string[]): AITool[] {
    if (!toolNames?.length) {
      return this.availableTools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));
    }

    return this.availableTools
      .filter((tool) => toolNames.includes(tool.name))
      .map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));
  }

  /**
   * Attempt to extract specific tool names from the user query
   * @param query The user's query
   * @returns Array of tool names mentioned in the query, or empty array if none found
   */
  private extractToolNames(query: string): string[] {
    const mentionedTools: string[] = [];

    for (const tool of this.availableTools) {
      const toolNameRegex = new RegExp(`\\b${tool.name}\\b`, "i");
      if (toolNameRegex.test(query)) {
        mentionedTools.push(tool.name);
      }
    }

    return mentionedTools;
  }

  /**
   * Process a user query and determine which tool to use
   * @param query User query
   * @param specificTools Optional array of specific tool names to consider
   * @returns Object containing the selected tool name and parameters
   */
  async processQuery(
    query: string,
    specificTools?: string[]
  ): Promise<{
    toolName: string;
    parameters: Record<string, any>;
    reasoning?: string;
  } | null> {
    if (!this.ensureInitialized()) return null;

    try {
      const mentionedTools = this.extractToolNames(query);
      const toolsToUse =
        specificTools || (mentionedTools.length ? mentionedTools : undefined);
      const tools = this.getToolDefinitions(toolsToUse);

      const messages = [
        { role: "system" as const, content: this.systemPrompt },
        { role: "user" as const, content: query },
      ];
      if (this.provider === "openai") {
        return this.processOpenAIQuery(tools, messages);
      }
      if (this.provider === "anthropic") {
        return this.processAnthropicQuery(tools, messages);
      }
      if (this.provider === "huggingface") {
        return this.processHuggingFaceQuery(tools, messages);
      }

      return null;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  private async processHuggingFaceQuery(
    tools: AITool[],
    messages: AIToolMessage[]
  ): Promise<AIToolResponse | null> {
    const response = await this.client.chatCompletion({
      tools,
      messages,
      max_tokens: 512,
      model: this.model,
    });
    if (!response.choices?.length) return null;

    const message = response.choices[0].message;
    const toolCall = markdownToJson<AITool["function"]>(message.content);

    if (!toolCall) return null;

    return {
      toolName: toolCall.name,
      reasoning: message.content,
      parameters: toolCall.parameters,
    };
  }

  private async processAnthropicQuery(
    tools: AITool[],
    messages: AIToolMessage[]
  ): Promise<AIToolResponse | null> {
    const response = await this.client.messages.create({
      tools,
      messages,
      max_tokens: 1024,
      model: this.model,
    });

    const content = response.content;

    if (Array.isArray(content) && content.length) {
      const toolCallItem = content.find((item) => item.type === "tool_call");

      if (toolCallItem?.tool_call) {
        const textItems = content.filter(
          (item) =>
            item.type === "text" &&
            content.indexOf(item) < content.indexOf(toolCallItem)
        );
        const reasoning = textItems.map((item) => item.text).join(" ");

        return {
          reasoning,
          toolName: toolCallItem.tool_call.name,
          parameters: JSON.parse(toolCallItem.tool_call.input),
        };
      }
    }

    return null;
  }

  private async processOpenAIQuery(
    tools: AITool[],
    messages: AIToolMessage[]
  ): Promise<AIToolResponse | null> {
    const response = await this.client.chat.completions.create({
      tools,
      messages,
      model: this.model,
      tool_choice: "auto",
    });
    if (!response.choices?.length) return null;

    const message = response.choices[0].message;
    const toolCall = markdownToJson<AITool["function"]>(message.content);

    if (!toolCall) return null;

    return {
      toolName: toolCall.name,
      reasoning: message.content,
      parameters: toolCall.parameters,
    };
  }

  private setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }
}
