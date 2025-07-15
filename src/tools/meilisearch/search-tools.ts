import { z } from "zod";
import apiClient from "../../utils/api-handler.js";
import { createErrorResponse } from "../../utils/error-handler.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Meilisearch Search Tools
 *
 * This module implements MCP tools for searching in Meilisearch indexes.
 */

// Define types for search parameters
interface SearchParams {
  indexUid: string;
  q: string;
  limit?: number;
  offset?: number;
  filter?: string | string[];
  sort?: string[];
  facets?: string[];
  attributesToRetrieve?: string[];
  attributesToCrop?: string[];
  cropLength?: number;
  attributesToHighlight?: string[];
  highlightPreTag?: string;
  highlightPostTag?: string;
  showMatchesPosition?: boolean;
  matchingStrategy?: string;
}

interface MultiSearchParams {
  queries: SearchParams[];
}

interface GlobalSearchParams
  extends Pick<SearchParams, "q" | "limit" | "attributesToRetrieve"> {
  indexUids: string[];
}

const SearchParamsSchema = {
  indexUid: z.string().describe("Unique identifier of the index"),
  q: z.string().describe("Search query"),
  limit: z
    .number()
    .min(1)
    .optional()
    .describe("Maximum number of results to return (default: 20)"),
  offset: z
    .number()
    .min(0)
    .optional()
    .describe("Number of results to skip (default: 0)"),
  filter: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe("Filter query to apply"),
  sort: z
    .array(z.string())
    .optional()
    .describe('Attributes to sort by, e.g. ["price:asc"]'),
  facets: z.array(z.string()).optional().describe("Facets to return"),
  attributesToRetrieve: z
    .array(z.string())
    .optional()
    .default(["*"])
    .describe("Attributes to include in results"),
  attributesToCrop: z
    .array(z.string())
    .optional()
    .describe("Attributes to crop"),
  cropLength: z
    .number()
    .optional()
    .describe("Length at which to crop cropped attributes"),
  attributesToHighlight: z
    .array(z.string())
    .optional()
    .describe("Attributes to highlight"),
  highlightPreTag: z
    .string()
    .optional()
    .describe("Tag to insert before highlighted text"),
  highlightPostTag: z
    .string()
    .optional()
    .describe("Tag to insert after highlighted text"),
  showMatchesPosition: z
    .boolean()
    .optional()
    .describe("Whether to include match positions in results"),
  matchingStrategy: z
    .string()
    .optional()
    .describe("Matching strategy: 'all' or 'last'"),
};

const getIndexUids = async (): Promise<string[]> => {
  const indexesResponse = await apiClient.get("/indexes", {
    params: { limit: 1000 },
  });
  const indexUids: string[] = indexesResponse.data.results.map(
    (index: { uid: string }) => index.uid
  );

  return indexUids;
};

const globalSearch = async ({
  q,
  limit,
  indexUids,
  attributesToRetrieve,
}: GlobalSearchParams) => {
  try {
    if (!indexUids?.length) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { hits: [], message: "No indexes found in Meilisearch." },
              null,
              2
            ),
          },
        ],
      };
    }

    const searchPromises = indexUids.map(async (uid) => {
      try {
        const searchResult = await apiClient.post(`/indexes/${uid}/search`, {
          q,
          limit,
          attributesToRetrieve,
        });
        return searchResult.data.hits.map((hit: any) => ({
          indexUid: uid,
          ...hit,
        }));
      } catch (searchError: any) {
        return [];
      }
    });

    const resultsPerIndex = await Promise.all(searchPromises);
    const result = { limit, query: q, hits: resultsPerIndex.flat() };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return createErrorResponse(error);
  }
};

/**
 * Register search tools with the MCP server
 *
 * @param server - The MCP server instance
 */
export const registerSearchTools = (server: McpServer) => {
  // Search in an index
  server.tool(
    "search",
    "Search for documents in a Meilisearch index",
    SearchParamsSchema,
    { category: "meilisearch" },
    async ({
      indexUid,
      q,
      limit,
      offset,
      filter,
      sort,
      facets,
      attributesToRetrieve,
      attributesToCrop,
      cropLength,
      attributesToHighlight,
      highlightPreTag,
      highlightPostTag,
      showMatchesPosition,
      matchingStrategy,
    }: SearchParams) => {
      try {
        const response = await apiClient.post(`/indexes/${indexUid}/search`, {
          q,
          limit,
          offset,
          filter,
          sort,
          facets,
          attributesToRetrieve,
          attributesToCrop,
          cropLength,
          attributesToHighlight,
          highlightPreTag,
          highlightPostTag,
          showMatchesPosition,
          matchingStrategy,
        });
        const indexUids = await getIndexUids();

        if (!indexUids.includes(indexUid)) {
          return await globalSearch({
            q,
            limit,
            indexUids,
            attributesToRetrieve,
          });
        }

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

  // Multi-search across multiple indexes
  server.tool(
    "multi-search",
    "Perform multiple searches in one request",
    {
      queries: z
        .array(z.object(SearchParamsSchema))
        .describe(
          "JSON array of search queries, each containing the same parameters as the `search` tool"
        ),
    },
    { category: "meilisearch" },
    async ({ queries }: MultiSearchParams) => {
      try {
        // Ensure queries is an array
        if (!Array.isArray(queries)) {
          return {
            isError: true,
            content: [{ type: "text", text: "Queries must be a JSON array" }],
          };
        }

        // Ensure each search has at least indexUid
        for (const search of queries) {
          if (!search.indexUid) {
            return {
              isError: true,
              content: [
                {
                  type: "text",
                  text: "Each search must have an indexUid field",
                },
              ],
            };
          }

          const indexUids = await getIndexUids();

          if (!indexUids.includes(search.indexUid)) {
            return await globalSearch({
              indexUids,
              q: search.q,
              limit: search.limit,
              attributesToRetrieve: search.attributesToRetrieve,
            });
          }
        }

        const response = await apiClient.post("/multi-search", {
          queries,
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

  server.tool(
    "global-search",
    "Search for a term across all available Meilisearch indexes and return combined results",
    {
      q: z.string().describe("Search query"),
      limit: z
        .number()
        .min(1)
        .optional()
        .describe(
          "Maximum number of results to return per index (default: 20)"
        ),
      attributesToRetrieve: z
        .array(z.string())
        .optional()
        .default(["*"])
        .describe("Attributes to include in results"),
    },
    { category: "meilisearch" },
    async ({
      q,
      limit,
      attributesToRetrieve,
    }: Omit<GlobalSearchParams, "indexUids">) => {
      const indexUids = await getIndexUids();

      return await globalSearch({
        q,
        limit,
        indexUids,
        attributesToRetrieve,
      });
    }
  );

  // Facet search
  server.tool(
    "facet-search",
    "Search for facet values matching specific criteria",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
      facetName: z.string().describe("Name of the facet to search"),
      facetQuery: z
        .string()
        .optional()
        .describe("Query to match against facet values"),
      filter: z
        .string()
        .optional()
        .describe("Filter to apply to the base search"),
    },
    { category: "meilisearch" },
    async ({ indexUid, facetName, facetQuery, filter }) => {
      try {
        const params: Record<string, any> = {
          facetName,
        };

        if (facetQuery !== undefined) params.facetQuery = facetQuery;
        if (filter) params.filter = filter;

        const response = await apiClient.post(
          `/indexes/${indexUid}/facet-search`,
          params
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

export default registerSearchTools;
