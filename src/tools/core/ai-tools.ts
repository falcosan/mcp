import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { AIService } from "../../utils/ai-handler.js";
import { createErrorResponse } from "../../utils/error-handler.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { convertNullToUndefined } from "../../utils/response-handler.js";

/**
 * AI Tools
 *
 * This module implements tools for AI-powered features in the MCP server.
 */

interface ProcessRegisteredToolsParams {
  description: string;
  inputSchema: z.ZodSchema;
  _meta?: { category?: string };
}

const setAvailableTools = (aiService: AIService, server: McpServer) => {
  const serverAny = server as unknown as {
    _registeredTools: Record<string, ProcessRegisteredToolsParams>;
  };
  const registeredTools = Object.entries(serverAny._registeredTools);
  const availableTools = registeredTools
    .filter(([_, { _meta }]) => _meta?.category !== "core")
    .map(([name, { description, inputSchema }]) => {
      const schema =
        inputSchema instanceof z.ZodType
          ? inputSchema
          : z.object(inputSchema as z.ZodRawShape);
      const { definitions } = zodToJsonSchema(schema, "parameters");
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
  server.registerTool(
    "process-ai-tool",
    {
      description:
        "Process a natural language query using AI to determine which tool to use",
      inputSchema: {
        query: z.string().describe("The natural language query to process"),
        specificTools: z
          .array(z.string())
          .optional()
          .describe("Optional array of specific tool names to consider"),
      },
      _meta: { category: "core" },
    },
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

  server.registerTool(
    "process-ai-text",
    {
      description:
        "Process a summary text using AI to describe the data result from a tool",
      inputSchema: {
        query: z.string().describe("The natural language query to process"),
      },
      _meta: { category: "core" },
    },
    async ({ query }) => {
      try {
        const aiService = AIService.getInstance();

        const response = await aiService.setupAIProcess(query, {
          processType: "text",
        });

        if (response.error) return createErrorResponse(response.error);

        const { summary: result } = response;

        return {
          isError: false,
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
};

export default registerAITools;
