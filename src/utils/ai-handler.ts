import { OpenAI } from "openai";

interface AIFunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

interface AITool {
  type: "function";
  function: AIFunctionDefinition;
}

interface AICompletionRequest {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  tools?: AITool[];
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
  private systemPrompt: string = `You are an AI assistant that helps users interact with a Meilisearch database through MCP tools.
Your job is to understand the user's query and select the most appropriate tool to use.
For search queries, determine if they're looking for specific content types or need to search across all indexes.
You can only use the tools provided to you. Always provide appropriate parameters for the chosen tool.
If the query mentions specific tool names directly, prioritize using those tools.`;

  /**
   * Create a new AI Inference Service
   * @param apiKey OpenAI API key
   * @param model Optional model to use (defaults to gpt-3.5-turbo)
   */
  constructor(apiKey?: string, model?: string) {
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
    if (model) {
      this.model = model;
    }
  }

  /**
   * Initialize the AI service with an API key
   * @param apiKey OpenAI API key
   */
  initialize(apiKey: string): void {
    this.client = new OpenAI({ apiKey });
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
        {
          role: "system" as const,
          content: this.systemPrompt,
        },
        { role: "user" as const, content: query },
      ];

      const response = await this.client.chat.completions.create({
        tools,
        messages,
        model: this.model,
        tool_choice: "auto",
      });

      const message = response.choices[0].message;

      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0];

        return {
          toolName: toolCall.function.name,
          parameters: JSON.parse(toolCall.function.arguments),
          reasoning: message.content || undefined,
        };
      }

      return null;
    } catch (error) {
      console.error("Error in AI inference:", error);
      throw error;
    }
  }

  /**
   * Set a custom system prompt for the AI
   * @param prompt The system prompt to use
   */
  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }
}

export const aiService = new AIService();
