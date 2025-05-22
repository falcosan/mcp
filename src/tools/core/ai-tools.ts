import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { AIService } from "../../utils/ai-handler.js";
import { createErrorResponse } from "../../utils/error-handler.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { convertNullToUndefined } from "../../utils/response-handler.js";

/**
 * Split text into chunks of specified size
 * This tries to split at sentence boundaries when possible
 * @param text - The text to split
 * @param chunkSize - The maximum size of each chunk (in characters)
 * @returns Array of text chunks
 */
const splitTextIntoChunks = (text: string, chunkSize: number): string[] => {
  // If text is smaller than chunk size, return as is
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    // Determine the end of the chunk
    let endIndex = Math.min(currentIndex + chunkSize, text.length);

    // Try to find a sentence boundary to break at if we're not at the end
    if (endIndex < text.length) {
      // Look for period, question mark, or exclamation mark followed by space or newline
      const sentenceEndMatch = text
        .substring(currentIndex, endIndex)
        .match(/[.!?]\s+/g);

      if (sentenceEndMatch && sentenceEndMatch.length > 0) {
        // Find the last sentence boundary within the chunk
        const lastMatch = sentenceEndMatch[sentenceEndMatch.length - 1];
        const lastMatchIndex = text.lastIndexOf(
          lastMatch,
          currentIndex + chunkSize
        );

        if (lastMatchIndex > currentIndex) {
          endIndex = lastMatchIndex + lastMatch.length;
        }
      } else {
        // If no sentence boundary, try to break at a space
        const lastSpace = text.lastIndexOf(" ", endIndex);
        if (lastSpace > currentIndex) {
          endIndex = lastSpace + 1;
        }
      }
    }

    // Add the chunk
    chunks.push(text.substring(currentIndex, endIndex));
    currentIndex = endIndex;
  }

  return chunks;
};

/**
 * AI Tools
 *
 * This module implements tools for AI-powered features in the MCP server.
 */

interface ProcessRegisteredToolsParams {
  description: string;
  inputSchema: z.ZodSchema;
  annotations?: ToolAnnotations;
}

const setAvailableTools = (aiService: AIService, server: McpServer) => {
  const registeredTools = Object.entries(
    (server as any)._registeredTools as {
      _registeredTools: ProcessRegisteredToolsParams;
    }
  );
  const availableTools = registeredTools
    .filter(([_, { annotations }]) => annotations?.category !== "core")
    .map(([name, { description, inputSchema }]) => {
      const { definitions } = zodToJsonSchema(inputSchema, "parameters");
      return {
        name,
        description,
        parameters: definitions?.parameters ?? {},
      };
    });

  aiService.setAvailableTools(availableTools);
};

/**
 * Register AI tools with the MCP server
 * @param server - The MCP server instance
 */
export const registerAITools = (server: McpServer) => {
  server.tool(
    "process-ai-tool",
    "Process a natural language query using AI to determine which tool to use",
    {
      query: z.string().describe("The natural language query to process"),
      specificTools: z
        .array(z.string())
        .optional()
        .describe("Optional array of specific tool names to consider"),
    },
    { category: "core" },
    async ({ query, specificTools }) => {
      try {
        const aiService = AIService.getInstance();

        setAvailableTools(aiService, server);

        const response = await aiService.setupAIProcess(query, {
          specificTools,
          processType: "tool",
        });

        if (response.error) return createErrorResponse(response.error);

        const { toolName, parameters: rawParameters } = response;
        const parameters = convertNullToUndefined(rawParameters);
        const result = {
          toolName,
          parameters,
          reasoning: JSON.stringify({ name: toolName, parameters }),
        };

        return {
          isError: false,
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.tool(
    "process-ai-text",
    "Process a summary text using AI to describe the data result from a tool",
    {
      query: z.string().describe("The natural language query to process"),
      chunkSize: z
        .number()
        .positive()
        .default(50000)
        .describe(
          "Optional size of chunks to split the query into (characters)"
        ),
    },
    { category: "core" },
    async ({ query, chunkSize }) => {
      try {
        const aiService = AIService.getInstance();

        if (query.length <= chunkSize) {
          const response = await aiService.setupAIProcess(query, {
            processType: "text",
          });

          if (response.error) return createErrorResponse(response.error);

          const { summary: result } = response;

          return {
            isError: false,
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }

        const chunks = splitTextIntoChunks(query, chunkSize);
        let combinedSummary = "";

        for (const chunk of chunks) {
          const response = await aiService.setupAIProcess(chunk, {
            processType: "text",
          });

          if (response.error) return createErrorResponse(response.error);

          if (response.summary) {
            combinedSummary += response.summary + " ";
          }
        }

        if (combinedSummary.length > 0) {
          const finalResponse = await aiService.setupAIProcess(
            `Synthesize the following text into a coherent summary: ${combinedSummary.trim()}`,
            { processType: "text" }
          );

          if (finalResponse.error)
            return createErrorResponse(finalResponse.error);

          const result = finalResponse.summary || combinedSummary.trim();

          return {
            isError: false,
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }

        return createErrorResponse("Failed to process query chunks");
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
};

export default registerAITools;
