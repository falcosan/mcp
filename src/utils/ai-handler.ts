import { OpenAI } from "openai";
import { markdownToJson } from "./response-handler.js";
import { InferenceClient } from "@huggingface/inference";
import { AiProviderNameOptions } from "../types/options.js";
import developerPrompts from "../prompts/developer/index.js";
import { OLLAMA_API, OPEN_ROUTER_API } from "../types/enums.js";
import { ChatCompletionInput, ChatCompletionOutput } from "@huggingface/tasks";

interface AITool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface AIProcessSetupOptions {
  specificTools?: string[];
  processType: "tool" | "text";
}

interface AIToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
  [key: string]: unknown;
}

interface AIToolMessage {
  content: string;
  role: "user" | "developer";
  [key: string]: unknown;
}

interface AIToolResponse {
  toolName?: string;
  parameters?: Record<string, unknown>;
}

interface AITextResponse {
  summary?: string;
}

interface AIProcessResponse extends AIToolResponse, AITextResponse {
  error?: unknown;
}

/**
 * AI Inference Service
 *
 * This service handles the interaction with the AI to determine the appropriate tools
 * to use based on the user's query
 */
export class AIService {
  private readonly chunkSize = 50000;
  private availableTools: AITool[] = [];
  private model: string = "gpt-3.5-turbo";
  private static instance: AIService | null = null;
  private static serverInitialized: boolean = false;
  private provider: AiProviderNameOptions = "openai";
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
      case "ollama":
        this.client = new OpenAI({ apiKey, baseURL: OLLAMA_API.baseURL });
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

  async setupAIProcess(
    query: string,
    options: AIProcessSetupOptions
  ): Promise<AIProcessResponse> {
    if (!this.ensureInitialized()) {
      return {
        error: "AI service not initialized. Please provide an API key.",
      };
    }

    const toolsSubstringIdentifier = "MCP_TOOLS";
    const { processType, specificTools } = options;

    let developerPrompt = developerPrompts[processType];

    const mentionedTools = this.extractToolNames(query);
    const toolsToUse =
      specificTools || (mentionedTools.length ? mentionedTools : undefined);
    const tools = this.getToolDefinitions(toolsToUse);

    if (developerPrompt.includes(toolsSubstringIdentifier)) {
      developerPrompt = developerPrompt.replace(
        toolsSubstringIdentifier,
        JSON.stringify(tools, null, 2)
      );
    }

    const messages = [
      { role: "developer" as const, content: developerPrompt },
      { role: "user" as const, content: query },
    ];

    if (processType === "text") {
      const processTextMethod =
        this.provider === "huggingface"
          ? this.processHuggingFaceText.bind(this)
          : this.processOpenAIText.bind(this);
      const chunks = this.splitTextIntoChunks(query, this.chunkSize);

      if (chunks.length === 1) {
        return processTextMethod(messages);
      }

      const results: AIProcessResponse[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const result = await processTextMethod([
          messages[0],
          { role: "user" as const, content: chunks[i] },
        ]);

        results.push(result);

        if (i < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      const error = results.find((result) => result.error);

      if (error) {
        return { error };
      }

      const summary = results.map((result) => result?.summary || "").join(" ");

      return { summary };
    } else {
      return this.provider === "huggingface"
        ? await this.processHuggingFaceTool(tools, messages)
        : await this.processOpenAITool(tools, messages);
    }
  }

  private async processOpenAITool(
    tools: AIToolDefinition[],
    messages: AIToolMessage[]
  ): Promise<AIProcessResponse> {
    try {
      const client = this.client as OpenAI;

      const response = await client.chat.completions.create({
        tools,
        messages,
        model: this.model,
        tool_choice: "required",
      });

      if (!response.choices?.length) {
        return {
          error: "No choices returned from OpenAI; processType: 'tool'",
        };
      }

      const message = response.choices[0].message;

      if (message.tool_calls?.length) {
        const toolCall = message.tool_calls[0]?.function;

        if (!toolCall) {
          return {
            error: "Invalid tool from OpenAI response; processType: 'tool'",
          };
        }

        return {
          toolName: toolCall.name,
          parameters: JSON.parse(toolCall.arguments),
        };
      }

      if (message.content) {
        const toolCall = markdownToJson<AITool>(message.content);

        if (!toolCall) {
          return {
            error: "Invalid tool call format in content; processType: 'tool'",
          };
        }

        return {
          toolName: toolCall.name,
          parameters: toolCall.parameters,
        };
      }

      return {
        error:
          "No tool call or content in OpenAI response; processType: 'tool'.",
      };
    } catch (error) {
      console.error(error);

      return { error };
    }
  }

  private async processOpenAIText(
    messages: AIToolMessage[]
  ): Promise<AIProcessResponse> {
    try {
      const client = this.client as OpenAI;

      const response = await client.chat.completions.create({
        messages,
        model: this.model,
      });

      if (!response.choices?.length) {
        return {
          error: "No response returned from OpenAI; processType: 'text'.",
        };
      }

      const message = response.choices[0].message;

      if (message.content) {
        return { summary: message.content };
      }

      return { error: "No content in OpenAI response; processType: 'text'." };
    } catch (error) {
      console.error(error);

      return { error };
    }
  }

  private async processHuggingFaceTool(
    tools: AIToolDefinition[],
    messages: AIToolMessage[]
  ): Promise<AIProcessResponse> {
    try {
      const client = this.client as typeof InferenceClient;

      const response: ChatCompletionOutput = await client.chatCompletion({
        tools,
        messages,
        model: this.model,
        tool_choice: "required",
      } as ChatCompletionInput);

      if (!response.choices?.length) {
        return {
          error: "No choices in Hugging Face response; processType: 'tool'",
        };
      }

      const message = response.choices[0].message;

      if (message.tool_calls?.length) {
        const toolCall = message.tool_calls[0]?.function;

        if (!toolCall) {
          return {
            error:
              "Invalid tool from Hugging Face response; processType: 'tool'",
          };
        }

        return {
          toolName: toolCall.name,
          parameters: JSON.parse(toolCall.arguments),
        };
      }

      if (message.content) {
        const toolCall = markdownToJson<AITool>(message.content);

        if (!toolCall)
          return {
            error: "Invalid tool call format in content; processType: 'tool'",
          };

        return {
          toolName: toolCall.name,
          parameters: toolCall.parameters,
        };
      }

      return {
        error:
          "No tool call or content in Hugging Face response; processType: 'tool'",
      };
    } catch (error) {
      console.error(error);

      return { error };
    }
  }

  private async processHuggingFaceText(
    messages: AIToolMessage[]
  ): Promise<AIProcessResponse> {
    try {
      const client = this.client as typeof InferenceClient;

      const response: ChatCompletionOutput = await client.chatCompletion({
        messages,
        model: this.model,
      } as ChatCompletionInput);

      if (!response.choices?.length) {
        return {
          error: "No response returned from OpenAI; processType: 'text'.",
        };
      }

      const message = response.choices[0].message;

      if (message.content) {
        return { summary: message.content };
      }

      return {
        error: "No content in Hugging Face response; processType: 'text'.",
      };
    } catch (error) {
      console.error(error);

      return { error };
    }
  }

  private splitTextIntoChunks(text: string, chunkSize: number): string[] {
    if (text.length <= chunkSize) {
      return [text];
    }

    let currentIndex = 0;

    const chunks: string[] = [];
    const textLength = text.length;
    const sentenceEndRegex = /[.!?]\s+/g;

    while (currentIndex < textLength) {
      let proposedEndIndex = Math.min(currentIndex + chunkSize, textLength);
      let actualEndIndex = proposedEndIndex;

      if (proposedEndIndex < textLength) {
        let bestBreakPoint = -1;

        const relevantTextSlice = text.substring(
          currentIndex,
          proposedEndIndex
        );

        let match;
        let lastMatch;

        sentenceEndRegex.lastIndex = 0;

        while ((match = sentenceEndRegex.exec(relevantTextSlice)) !== null) {
          lastMatch = match;
        }

        if (lastMatch) {
          bestBreakPoint = currentIndex + lastMatch.index + lastMatch[0].length;
        }

        if (bestBreakPoint > currentIndex) {
          actualEndIndex = bestBreakPoint;
        } else {
          const lastSpaceIndex = text.lastIndexOf(" ", proposedEndIndex - 1);

          if (lastSpaceIndex > currentIndex) {
            actualEndIndex = lastSpaceIndex + 1;
          } else {
            actualEndIndex = proposedEndIndex;
          }
        }
      } else {
        actualEndIndex = textLength;
      }

      chunks.push(text.substring(currentIndex, actualEndIndex));
      currentIndex = actualEndIndex;
    }

    return chunks;
  }
}
