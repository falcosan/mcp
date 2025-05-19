import { OpenAI } from "openai";
import systemPrompt from "../prompts/system.js";
import { OPEN_ROUTER_API } from "../types/enums.js";
import { InferenceClient } from "@huggingface/inference";
import { AiProviderNameOptions } from "../types/options.js";
import { markdownToJson, cleanNullValues } from "./response-handler.js";
import { ChatCompletionInput, ChatCompletionOutput } from "@huggingface/tasks";

interface AITool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface AIToolDefinition {
  type: "function";
  function: {
    name: string;
    strict: true;
    description: string;
    parameters: Record<string, unknown>;
  };
  [key: string]: unknown;
}

interface AIToolMessage {
  content: string;
  role: "user" | "system";
  [key: string]: unknown;
}

interface AIToolResponse {
  toolName?: string;
  reasoning?: string;
  error: string | null;
  parameters?: Record<string, unknown>;
}

/**
 * AI Inference Service
 *
 * This service handles the interaction with the AI to determine the appropriate tools
 * to use based on the user's query
 */
export class AIService {
  private availableTools: AITool[] = [];
  private model: string = "gpt-3.5-turbo";
  private static instance: AIService | null = null;
  private static serverInitialized: boolean = false;
  private provider: AiProviderNameOptions = "openai";
  private readonly systemPrompt: string = systemPrompt;
  private client: OpenAI | typeof InferenceClient | null = null;

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
        this.client = new OpenAI({ apiKey });
        break;
      case "huggingface":
        this.client = new InferenceClient(apiKey);
        break;
      case "openrouter":
        this.client = new OpenAI({ apiKey, baseURL: OPEN_ROUTER_API.baseURL });
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
  setAvailableTools(tools: AITool[]): void {
    this.availableTools = tools;
  }

  ensureInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * Get tool definitions for the AI from the available tools
   * @param toolNames Optional array of tool names to filter by (if not provided, all tools will be included)
   * @returns Array of tool definitions
   */
  private getToolDefinitions(toolNames?: string[]): AIToolDefinition[] {
    const tools = toolNames?.length
      ? this.availableTools.filter((tool) => toolNames.includes(tool.name))
      : this.availableTools;

    return tools.map((tool) => ({
      type: "function",
      function: {
        strict: true,
        name: tool.name,
        parameters: tool.parameters,
        description: tool.description,
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
  ): Promise<AIToolResponse> {
    if (!this.ensureInitialized()) {
      return {
        error: "AI service not initialized. Please provide an API key.",
      };
    }

    const mentionedTools = this.extractToolNames(query);
    const toolsToUse =
      specificTools || (mentionedTools.length ? mentionedTools : undefined);
    const tools = this.getToolDefinitions(toolsToUse);
    const systemPrompt = this.systemPrompt.replace(
      "MCP_TOOLS",
      JSON.stringify(tools, null, 2)
    );

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: query },
    ];

    if (this.provider === "huggingface") {
      return await this.processHuggingFaceQuery(tools, messages);
    }

    return await this.processOpenAIQuery(tools, messages);
  }

  private async processOpenAIQuery(
    tools: AIToolDefinition[],
    messages: AIToolMessage[]
  ): Promise<AIToolResponse> {
    try {
      const client = this.client as OpenAI;

      const response = await client.chat.completions.create({
        tools,
        messages,
        model: this.model,
        tool_choice: "required",
      });

      if (!response.choices?.length) {
        return { error: "No choices returned from OpenAI" };
      }

      const message = response.choices[0].message;

      if (message.tool_calls?.length) {
        const toolCall = message.tool_calls[0]?.function;

        if (!toolCall) {
          return { error: "Invalid tool from OpenAI response" };
        }

        const inferenceToolResponse = {
          name: toolCall.name,
          parameters: cleanNullValues(JSON.parse(toolCall.arguments)),
        };

        return {
          error: null,
          toolName: inferenceToolResponse.name,
          parameters: inferenceToolResponse.parameters,
          reasoning: JSON.stringify(inferenceToolResponse, null, 2),
        };
      }

      if (message.content) {
        const toolCall = markdownToJson<AITool>(message.content);

        if (!toolCall) {
          return {
            error: `Invalid tool call format in content: ${message.content}`,
          };
        }

        return {
          error: null,
          toolName: toolCall.name,
          parameters: toolCall.parameters,
          reasoning: JSON.stringify(toolCall, null, 2),
        };
      }

      return { error: "No tool call or content in OpenAI response" };
    } catch (error) {
      return { error: `OpenAI API error: ${error}` };
    }
  }

  private async processHuggingFaceQuery(
    tools: AIToolDefinition[],
    messages: AIToolMessage[]
  ): Promise<AIToolResponse> {
    try {
      const client = this.client as typeof InferenceClient;
      const response: ChatCompletionOutput = await client.chatCompletion({
        tools,
        messages,
        model: this.model,
        tool_choice: "required",
      } as ChatCompletionInput);

      if (!response.choices?.length) {
        return { error: "No choices in Hugging Face response" };
      }

      const message = response.choices[0].message;

      if (message.tool_calls?.length) {
        const toolCall = message.tool_calls[0]?.function;

        if (!toolCall) {
          return { error: "Invalid tool from Hugging Face response" };
        }

        const inferenceToolResponse = {
          name: toolCall.name,
          parameters: cleanNullValues(JSON.parse(toolCall.arguments)),
        };

        return {
          error: null,
          toolName: inferenceToolResponse.name,
          parameters: inferenceToolResponse.parameters,
          reasoning: JSON.stringify(inferenceToolResponse, null, 2),
        };
      }

      if (message.content) {
        const toolCall = markdownToJson<AITool>(message.content);

        if (!toolCall) return { error: "Invalid tool call format in content" };

        return {
          error: null,
          toolName: toolCall.name,
          parameters: toolCall.parameters,
          reasoning: JSON.stringify(toolCall, null, 2),
        };
      }

      return { error: "No tool call or content in Hugging Face response" };
    } catch (error) {
      return { error: `Hugging Face API error: ${error}` };
    }
  }
}
