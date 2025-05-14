import { OpenAI } from "openai";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

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
  private client: OpenAI | null = null;
  private availableTools: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  }[] = [];
  private model: string = "gpt-3.5-turbo";
  private systemPrompt: string = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../assets/prompt.txt"),
    "utf8"
  );

  /**
   * Create a new AI Inference Service
   * The service needs to be initialized with an API key before use.
   */
  constructor() {}

  /**
   * Initialize the AI service with an API key and optionally set the model
   * @param apiKey OpenAI API key (required)
   * @param model Optional model to use (defaults to gpt-3.5-turbo)
   */
  initialize(apiKey: string, model?: string): void {
    this.client = new OpenAI({ apiKey });
    if (model) this.model = model;
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
  }

  /**
   * Get tool definitions for the AI in the format expected by OpenAI
   * @param toolNames Optional array of tool names to filter by (if not provided, all tools will be included)
   * @returns Array of tool definitions
   */
  private getToolDefinitions(toolNames?: string[]): AITool[] {
    if (!toolNames || toolNames.length === 0) {
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
    if (!this.client) {
      throw new Error("AI service not initialized. Please provide an API key.");
    }

    if (this.availableTools.length === 0) {
      throw new Error("No tools available for the AI to use.");
    }

    try {
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

export const aiService = new AIService();
