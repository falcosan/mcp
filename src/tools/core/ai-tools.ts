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

interface ProcessAIQueryParams {
  query: string;
  specificTools?: string[];
}

interface ProcessRegisteredToolsParams {
  description: string;
  inputSchema: z.ZodSchema;
  annotations?: ToolAnnotations;
}

/**
 * Register AI tools with the MCP server
 * @param server - The MCP server instance
 */
export const registerAITools = (server: McpServer) => {
  server.tool(
    "process-ai-query",
    "Process a natural language query using AI to determine which tool to use",
    {
      query: z.string().describe("The natural language query to process"),
      specificTools: z
        .array(z.string())
        .optional()
        .describe("Optional array of specific tool names to consider"),
    },
    { category: "core" },
    async ({ query, specificTools }: ProcessAIQueryParams) => {
      try {
        const aiService = AIService.getInstance();
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

        const response = await aiService.processQuery(query, specificTools);

        if (response.error) return createErrorResponse(response.error);

        return {
          isError: false,
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  toolName: response.toolName,
                  reasoning: response.reasoning,
                  parameters: convertNullToUndefined(response.parameters),
                },
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
