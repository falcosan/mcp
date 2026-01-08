import { z } from "zod";
import apiClient from "../../utils/api-handler.js";
import { createErrorResponse } from "../../utils/error-handler.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Meilisearch Index Management Tools
 *
 * This module implements MCP tools for managing Meilisearch indexes.
 */

// Define types for index parameters
interface ListIndexesParams {
  limit?: number;
  offset?: number;
}

interface GetIndexParams {
  indexUid: string;
}

interface CreateIndexParams {
  indexUid: string;
  primaryKey?: string;
}

interface UpdateIndexParams {
  indexUid: string;
  primaryKey: string;
}

interface DeleteIndexParams {
  indexUid: string;
}

interface SwapIndexesParams {
  indexes: string;
}

/**
 * Register index management tools with the MCP server
 *
 * @param server - The MCP server instance
 */
export const registerIndexTools = (server: McpServer) => {
  // List all indexes
  server.registerTool(
    "list-indexes",
    {
      description: "List all indexes in the Meilisearch instance",
      inputSchema: {
        limit: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum number of indexes to return"),
        offset: z
          .number()
          .min(0)
          .optional()
          .describe("Number of indexes to skip"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ limit, offset }: ListIndexesParams) => {
      try {
        const response = await apiClient.get("/indexes", {
          params: {
            limit,
            offset,
          },
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

  // Get a specific index
  server.registerTool(
    "get-index",
    {
      description: "Get information about a specific Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }: GetIndexParams) => {
      try {
        const response = await apiClient.get(`/indexes/${indexUid}`);
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

  // Create a new index
  server.registerTool(
    "create-index",
    {
      description: "Create a new Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier for the new index"),
        primaryKey: z.string().optional().describe("Primary key for the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid, primaryKey }: CreateIndexParams) => {
      try {
        const response = await apiClient.post("/indexes", {
          uid: indexUid,
          primaryKey,
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

  // Update an index
  server.registerTool(
    "update-index",
    {
      description:
        "Update a Meilisearch index (currently only supports updating the primary key)",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
        primaryKey: z.string().describe("New primary key for the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid, primaryKey }: UpdateIndexParams) => {
      try {
        const response = await apiClient.patch(`/indexes/${indexUid}`, {
          primaryKey,
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

  // Delete an index
  server.registerTool(
    "delete-index",
    {
      description: "Delete a Meilisearch index",
      inputSchema: {
        indexUid: z
          .string()
          .describe("Unique identifier of the index to delete"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }: DeleteIndexParams) => {
      try {
        const response = await apiClient.delete(`/indexes/${indexUid}`);
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

  // Swap indexes
  server.registerTool(
    "swap-indexes",
    {
      description: "Swap two or more indexes in Meilisearch",
      inputSchema: {
        indexes: z
          .string()
          .describe(
            'JSON array of index pairs to swap, e.g. [["movies", "movies_new"]]'
          ),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexes }: SwapIndexesParams) => {
      try {
        const parsedIndexes = JSON.parse(indexes);

        if (
          !Array.isArray(parsedIndexes) ||
          !parsedIndexes.every(
            (pair) => Array.isArray(pair) && pair.length === 2
          )
        ) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: 'Indexes must be a JSON array of pairs, e.g. [["movies", "movies_new"]]',
              },
            ],
          };
        }

        const response = await apiClient.post("/swap-indexes", parsedIndexes);
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

export default registerIndexTools;
