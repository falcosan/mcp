import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { AIService } from "../../utils/ai-handler.js";
import { createErrorResponse } from "../../utils/error-handler.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { convertNullToUndefined } from "../../utils/response-handler.js";

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

const splitTextIntoChunks = (text: string, chunkSize: number): string[] => {
  if (text.length <= chunkSize) {
    return [text];
  }

  let currentIndex = 0;
  const chunks: string[] = [];

  while (currentIndex < text.length) {
    let endIndex = Math.min(currentIndex + chunkSize, text.length);

    if (endIndex < text.length) {
      const sentenceEndMatch = text
        .substring(currentIndex, endIndex)
        .match(/[.!?]\s+/g);

      if (sentenceEndMatch?.length) {
        const lastMatch = sentenceEndMatch[sentenceEndMatch.length - 1];
        const lastMatchIndex = text.lastIndexOf(
          lastMatch,
          currentIndex + chunkSize
        );

        if (lastMatchIndex > currentIndex) {
          endIndex = lastMatchIndex + lastMatch.length;
        }
      } else {
        const lastSpace = text.lastIndexOf(" ", endIndex);
        if (lastSpace > currentIndex) {
          endIndex = lastSpace + 1;
        }
      }
    }

    chunks.push(text.substring(currentIndex, endIndex));
    currentIndex = endIndex;
  }

  return chunks;
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

          return response.error
            ? createErrorResponse(response.error)
            : {
                isError: false,
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(response.summary, null, 2),
                  },
                ],
              };
        }

        const chunks = splitTextIntoChunks(query, chunkSize);
        const chunkPromises = chunks.map((chunk) =>
          aiService.setupAIProcess(chunk, { processType: "text" })
        );

        const chunkResponses = await Promise.all(chunkPromises);

        const errorResponse = chunkResponses.find((response) => response.error);
        if (errorResponse) {
          return createErrorResponse(errorResponse.error);
        }

        const summaries = chunkResponses
          .map((response) => response.summary)
          .filter(Boolean);

        if (!summaries.length) {
          return createErrorResponse("Failed to process query chunks");
        }

        if (summaries.length === 1) {
          return {
            isError: false,
            content: [
              { type: "text", text: JSON.stringify(summaries[0], null, 2) },
            ],
          };
        }

        const combinedText = summaries.join(" ");
        const finalResponse = await aiService.setupAIProcess(
          `Synthesize the following text into a coherent summary: ${combinedText}`,
          { processType: "text" }
        );

        return finalResponse.error
          ? createErrorResponse(finalResponse.error)
          : {
              isError: false,
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    finalResponse.summary || combinedText,
                    null,
                    2
                  ),
                },
              ],
            };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
};

export default registerAITools;
