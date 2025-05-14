import { z } from "zod";
import { AIService } from "../utils/ai-handler.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createErrorResponse } from "../utils/error-handler.js";

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
    async ({ query, specificTools }: ProcessAIQueryParams) => {
      try {
        const aiService = AIService.getInstance();
        const availableTools = Object.entries(server._registeredTools)
          .filter(([name]) => name !== "process-ai-query")
          .map(([name, { description }]) => ({
            name,
            description,
            parameters: {},
          }));
        aiService.setAvailableTools(availableTools);

        const result = await aiService.processQuery(query, specificTools);

        if (!result) {
          return {
            content: [
              {
                type: "text",
                text: "AI couldn't determine an appropriate tool to use for this query.",
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  toolName: result.toolName,
                  parameters: result.parameters,
                  reasoning: result.reasoning || "No explanation provided",
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
