import { OpenAI } from "openai";
import systemPrompt from "../prompts/system.js";
import { markdownToJson } from "./response-handler.js";
import { InferenceClient } from "@huggingface/inference";

interface AITool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

interface AIToolDefinition {
  type: "function";
  function: {
    name: string;
    strict: true;
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
  reasoning?: string | null;
  parameters: Record<string, any>;
}

/**
 * AI Inference Service
 *
 * This service handles the interaction with the AI to determine the appropriate tools
 * to use based on the user's query
 */
export class AIService {
  private provider: string = "openai";
  private model: string = "gpt-3.5-turbo";
  private static instance: AIService | null = null;
  private static serverInitialized: boolean = false;
  private readonly systemPrompt: string = systemPrompt;
  private client: OpenAI | InferenceClient | null = null;
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
  initialize(apiKey: string, provider: string, model?: string): void {
    if (AIService.serverInitialized) {
      console.warn("AIService has already been initialized by the server.");
      return;
    }

    this.provider = provider;
    if (model) this.model = model;

    switch (this.provider) {
      case "huggingface":
        this.client = new InferenceClient(apiKey);
        break;
      default:
        this.client = new OpenAI({
          apiKey,
          baseURL: this.resolveOpenAIEndpoint(),
        });
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

  /**
   * Check if the AI service is initialized
   * @returns true if initialized, false otherwise
   */
  ensureInitialized(): boolean {
    return this.client !== null;
  }

  private resolveOpenAIEndpoint(): string | undefined {
    const isOpenAI = this.provider === "openai";
    const isNamespaced = this.model.includes("/");

    if (isOpenAI && !isNamespaced) return undefined;

    return "https://openrouter.ai/api/v1";
  }

  private resolveOpenAIModel(): string {
    const isOpenAI = this.provider === "openai";
    const isNamespaced = this.model.includes("/");

    if (isOpenAI && !isNamespaced) return this.model;

    if (this.model.startsWith(`${this.provider}/`)) {
      return this.model;
    }
    return `${this.provider}/${this.model}`;
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
  ): Promise<AIToolResponse | null> {
    if (!this.ensureInitialized()) return null;

    try {
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
        return this.processHuggingFaceQuery(tools, messages);
      }
      return this.processOpenAIQuery(tools, messages);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  private async processOpenAIQuery(
    tools: AIToolDefinition[],
    messages: AIToolMessage[]
  ): Promise<AIToolResponse | null> {
    const client = this.client as OpenAI;
    const model = this.resolveOpenAIModel();

    const response = await client.chat.completions
      .create({
        tools,
        model,
        messages,
      })
      .catch((error: any) => {
        console.error("Error in OpenAI API call:", error);
        return null;
      });

    if (!response?.choices.length) return null;

    const message = response.choices[0].message;

    if (!message.content) return null;

    const toolCall = markdownToJson<AITool>(message.content);

    if (!toolCall) return null;
    return {
      toolName: toolCall.name,
      reasoning: message.content,
      parameters: toolCall.parameters,
    };
  }

  private async processHuggingFaceQuery(
    tools: AIToolDefinition[],
    messages: AIToolMessage[]
  ): Promise<AIToolResponse | null> {
    const client = this.client as InferenceClient;

    const response = await client
      .chatCompletion({
        tools,
        messages,
        max_tokens: 512,
        model: this.model,
      })
      .catch((error: any) => {
        console.error("Error in HugginFace API call:", error);
        return null;
      });

    if (!response?.choices.length) return null;

    const message = response.choices[0].message;

    if (!message.content) return null;

    const toolCall = markdownToJson<AITool>(message.content);

    if (!toolCall) return null;
    return {
      toolName: toolCall.name,
      reasoning: message.content,
      parameters: toolCall.parameters,
    };
  }
}
