import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { AIService } from "../../utils/ai-handler.js";
import { cleanNullValues } from "../../utils/response-handler.js";
import { createErrorResponse } from "../../utils/error-handler.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * AI Tools
 *
 * This module implements tools for AI-powered features in the MCP server.
 */

interface ProcessAIQueryParams {
  query: string;
  specificTools?: string[];
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
        const availableTools = Object.entries(server._registeredTools)
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

        const result = await aiService.processQuery(query, specificTools);

        if (result.error) return createErrorResponse(result.error);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  toolName: result.toolName,
                  reasoning: result.reasoning,
                  parameters: cleanNullValues(result.parameters),
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
