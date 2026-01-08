import { z } from "zod";
import apiClient from "../../utils/api-handler.js";
import { createErrorResponse } from "../../utils/error-handler.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Meilisearch Vector Search Tools
 *
 * This module implements MCP tools for vector search capabilities in Meilisearch.
 * Note: Vector search is an experimental feature in Meilisearch.
 */

/**
 * Register vector search tools with the MCP server
 *
 * @param server - The MCP server instance
 */
export const registerVectorTools = (server: McpServer) => {
  // Enable vector search experimental feature
  server.registerTool(
    "enable-vector-search",
    {
      description:
        "Enable the vector search experimental feature in Meilisearch",
      inputSchema: {},
      _meta: { category: "meilisearch" },
    },
    async () => {
      try {
        const response = await apiClient.post("/experimental-features", {
          vectorStore: true,
        });
        return {
          content: [
            { type: "text", text: JSON.stringify(response.data, null, 2) },
          ],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.registerTool(
    "get-experimental-features",
    {
      description: "Get the status of experimental features in Meilisearch",
      inputSchema: {},
      _meta: { category: "meilisearch" },
    },
    async () => {
      try {
        const response = await apiClient.get("/experimental-features");
        return {
          content: [
            { type: "text", text: JSON.stringify(response.data, null, 2) },
          ],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.registerTool(
    "update-embedders",
    {
      description: "Configure embedders for vector search",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
        embedders: z
          .string()
          .describe("JSON object containing embedder configurations"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid, embedders }) => {
      try {
        const parsedEmbedders = JSON.parse(embedders);

        if (
          typeof parsedEmbedders !== "object" ||
          parsedEmbedders === null ||
          Array.isArray(parsedEmbedders)
        ) {
          return {
            isError: true,
            content: [
              { type: "text", text: "Embedders must be a JSON object" },
            ],
          };
        }

        const response = await apiClient.patch(
          `/indexes/${indexUid}/settings/embedders`,
          parsedEmbedders
        );
        return {
          content: [
            { type: "text", text: JSON.stringify(response.data, null, 2) },
          ],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.registerTool(
    "get-embedders",
    {
      description: "Get the embedders configuration for an index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.get(
          `/indexes/${indexUid}/settings/embedders`
        );
        return {
          content: [
            { type: "text", text: JSON.stringify(response.data, null, 2) },
          ],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.registerTool(
    "reset-embedders",
    {
      description: "Reset the embedders configuration for an index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.delete(
          `/indexes/${indexUid}/settings/embedders`
        );
        return {
          content: [
            { type: "text", text: JSON.stringify(response.data, null, 2) },
          ],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.registerTool(
    "vector-search",
    {
      description: "Perform a vector search in a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
        vector: z
          .string()
          .describe("JSON array representing the vector to search for"),
        limit: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe("Maximum number of results to return (default: 20)"),
        offset: z
          .number()
          .min(0)
          .optional()
          .describe("Number of results to skip (default: 0)"),
        filter: z
          .string()
          .optional()
          .describe("Filter to apply (e.g., 'genre = horror AND year > 2020')"),
        embedder: z
          .string()
          .optional()
          .describe(
            "Name of the embedder to use (if omitted, a 'vector' must be provided)"
          ),
        attributes: z
          .array(z.string())
          .optional()
          .describe("Attributes to include in the vector search"),
        query: z
          .string()
          .optional()
          .describe(
            "Text query to search for (if using 'embedder' instead of 'vector')"
          ),
        hybrid: z
          .boolean()
          .optional()
          .describe(
            "Whether to perform a hybrid search (combining vector and text search)"
          ),
        hybridRatio: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe(
            "Ratio of vector vs text search in hybrid search (0-1, default: 0.5)"
          ),
      },
      _meta: { category: "meilisearch" },
    },
    async ({
      indexUid,
      vector,
      limit,
      offset,
      filter,
      embedder,
      attributes,
      query,
      hybrid,
      hybridRatio,
    }) => {
      try {
        const searchParams: Record<string, unknown> = {};

        if (vector) {
          try {
            searchParams.vector = JSON.parse(vector);
          } catch (parseError) {
            return {
              isError: true,
              content: [
                { type: "text", text: "Vector must be a valid JSON array" },
              ],
            };
          }
        }

        if (embedder) {
          searchParams.embedder = embedder;

          if (query !== undefined) {
            searchParams.q = query;
          }
        }

        if (!vector && (!embedder || query === undefined)) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "Either 'vector' or both 'embedder' and 'query' must be provided",
              },
            ],
          };
        }

        if (limit !== undefined) searchParams.limit = limit;
        if (offset !== undefined) searchParams.offset = offset;
        if (filter) searchParams.filter = filter;
        if (attributes?.length) searchParams.attributes = attributes;
        if (hybrid !== undefined) searchParams.hybrid = hybrid;
        if (hybridRatio !== undefined) searchParams.hybridRatio = hybridRatio;

        const response = await apiClient.post(
          `/indexes/${indexUid}/search`,
          searchParams
        );
        return {
          content: [
            { type: "text", text: JSON.stringify(response.data, null, 2) },
          ],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
};

export default registerVectorTools;
