import { OpenAI } from "openai";
import generalPrompt from "../prompts/general.js";
import { InferenceClient } from "@huggingface/inference";

interface AITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

/**
 * AI Inference Service
 *
 * This service handles the interaction with the AI to determine the appropriate tools
 * to use based on the user's query
 */
export class AIService {
  private model: string = "gpt-3.5-turbo";
  private systemPrompt: string = generalPrompt;
  private static instance: AIService | null = null;
  private static serverInitialized: boolean = false;
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
   * @param model Optional model to use (defaults to gpt-3.5-turbo)
   */
  initialize(apiKey: string, provider = "openai", model?: string): void {
    if (AIService.serverInitialized) {
      console.warn("AIService has already been initialized by the server.");
      return;
    }
    switch (provider) {
      case "huggingface":
        this.client = new InferenceClient(apiKey);
        break;
      default:
        this.client = new OpenAI({ apiKey });
    }
    if (model) this.model = model;

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
    try {
      if (!this.ensureInitialized()) return null;

      const mentionedTools = this.extractToolNames(query);
      const toolsToUse =
        specificTools || (mentionedTools.length ? mentionedTools : undefined);
      const tools = this.getToolDefinitions(toolsToUse);

      const messages = [
        { role: "user" as const, content: query },
        { role: "system" as const, content: this.systemPrompt },
      ];

      const response = await this.client.chat.completions.create({
        tools,
        messages,
        model: this.model,
        tool_choice: "auto",
      });

      const message = response.choices[0].message;

      if (message.tool_calls?.length) {
        const toolCall = message.tool_calls[0];

        return {
          toolName: toolCall.function.name,
          reasoning: message.content || undefined,
          parameters: JSON.parse(toolCall.function.arguments),
        };
      }

      return null;
    } catch (error) {
      console.error("Error in AI inference:", error);
      throw error;
    }
  }

  private setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }
}
