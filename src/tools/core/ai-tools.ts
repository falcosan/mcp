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
  justReasoning?: boolean;
}

interface ProcessRegisteredToolsParams {
  description: string;
  inputSchema: z.ZodSchema;
  annotations?: ToolAnnotations;
  callback: (parameters: unknown) => Promise<unknown>;
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
      justReasoning: z
        .boolean()
        .optional()
        .describe(
          "If true, only returns the reasoning without calling the tool"
        ),
    },
    { category: "core" },
    async ({ query, specificTools, justReasoning }: ProcessAIQueryParams) => {
      try {
        const aiService = AIService.getInstance();
        const registeredTools = Object.entries(
          (server as any)._registeredTools as {
            _registeredTools: ProcessRegisteredToolsParams;
          }
        );
        const availableTools = registeredTools
          .filter(([_, { annotations }]) => annotations?.category !== "core")
          .map(([name, { callback, description, inputSchema }]) => {
            const { definitions } = zodToJsonSchema(inputSchema, "parameters");
            return {
              name,
              callback,
              description,
              parameters: definitions?.parameters ?? {},
            };
          });

        aiService.setAvailableTools(availableTools);

        const response = await aiService.processQuery(query, specificTools);

        if (response.error) return createErrorResponse(response.error);

        const toolUsed = response.toolName;
        const parameters = convertNullToUndefined(response.parameters);
        const reasoning = JSON.stringify({ parameters, name: toolUsed });

        if (justReasoning) {
          return {
            isError: false,
            content: [
              {
                type: "text",
                text: JSON.stringify({ reasoning, toolUsed }),
              },
            ],
          };
        }

        const toolToCall = availableTools.find(
          (tool) => tool.name === response.toolName
        );
        if (!toolToCall) {
          return createErrorResponse("No tool name provided in AI response");
        }
        const result = await toolToCall.callback(parameters);

        if (!result) {
          return createErrorResponse("Received null or undefined result");
        }

        return {
          isError: false,
          content: [
            {
              type: "text",
              text: JSON.stringify({ ...result, reasoning, toolUsed }, null, 2),
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
