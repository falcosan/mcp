import { z } from "zod";
import apiClient from "../../utils/api-handler.js";
import { createErrorResponse } from "../../utils/error-handler.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Meilisearch Settings Management Tools
 *
 * This module implements MCP tools for managing index settings in Meilisearch.
 */

/**
 * Register settings management tools with the MCP server
 *
 * @param server - The MCP server instance
 */
export const registerSettingsTools = (server: McpServer) => {
  // Get all settings for an index
  server.registerTool(
    "get-settings",
    {
      description: "Get all settings for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.get(`/indexes/${indexUid}/settings`);
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
    "update-settings",
    {
      description: "Update all settings for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
        settings: z
          .string()
          .describe("JSON object containing settings to update"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid, settings }) => {
      try {
        const parsedSettings = JSON.parse(settings);

        if (
          typeof parsedSettings !== "object" ||
          parsedSettings === null ||
          Array.isArray(parsedSettings)
        ) {
          return {
            isError: true,
            content: [{ type: "text", text: "Settings must be a JSON object" }],
          };
        }

        const response = await apiClient.patch(
          `/indexes/${indexUid}/settings`,
          parsedSettings
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
    "reset-settings",
    {
      description:
        "Reset all settings for a Meilisearch index to their default values",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.delete(
          `/indexes/${indexUid}/settings`
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
    "get-displayed-attributes",
    {
      description:
        "Get the displayed attributes setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.get(
          `/indexes/${indexUid}/settings/displayed-attributes`
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
    "update-displayed-attributes",
    {
      description:
        "Update the displayed attributes setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
        displayedAttributes: z
          .string()
          .describe(
            'JSON array of attributes to display, e.g. ["title", "description"]'
          ),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid, displayedAttributes }) => {
      try {
        const response = await apiClient.put(
          `/indexes/${indexUid}/settings/displayed-attributes`,
          displayedAttributes
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
    "reset-displayed-attributes",
    {
      description:
        "Reset the displayed attributes setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.delete(
          `/indexes/${indexUid}/settings/displayed-attributes`
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
    "get-filterable-attributes",
    {
      description:
        "Get the filterable attributes setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.get(
          `/indexes/${indexUid}/settings/filterable-attributes`
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
    "update-filterable-attributes",
    {
      description:
        "Update the filterable attributes setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
        filterableAttributes: z
          .string()
          .describe(
            'JSON array of attributes that can be used as filters, e.g. ["genre", "director"]'
          ),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid, filterableAttributes }) => {
      try {
        const response = await apiClient.put(
          `/indexes/${indexUid}/settings/filterable-attributes`,
          filterableAttributes
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
    "reset-filterable-attributes",
    {
      description:
        "Reset the filterable attributes setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.delete(
          `/indexes/${indexUid}/settings/filterable-attributes`
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
    "get-sortable-attributes",
    {
      description:
        "Get the sortable attributes setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.get(
          `/indexes/${indexUid}/settings/sortable-attributes`
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
    "update-sortable-attributes",
    {
      description:
        "Update the sortable attributes setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
        sortableAttributes: z
          .string()
          .describe(
            'JSON array of attributes that can be used for sorting, e.g. ["price", "date"]'
          ),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid, sortableAttributes }) => {
      try {
        const response = await apiClient.put(
          `/indexes/${indexUid}/settings/sortable-attributes`,
          sortableAttributes
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
    "reset-sortable-attributes",
    {
      description:
        "Reset the sortable attributes setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.delete(
          `/indexes/${indexUid}/settings/sortable-attributes`
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
    "get-searchable-attributes",
    {
      description:
        "Get the searchable attributes setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.get(
          `/indexes/${indexUid}/settings/searchable-attributes`
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
    "update-searchable-attributes",
    {
      description:
        "Update the searchable attributes setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
        searchableAttributes: z
          .string()
          .describe(
            'JSON array of attributes that can be searched, e.g. ["title", "description"]'
          ),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid, searchableAttributes }) => {
      try {
        const response = await apiClient.put(
          `/indexes/${indexUid}/settings/searchable-attributes`,
          searchableAttributes
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
    "reset-searchable-attributes",
    {
      description:
        "Reset the searchable attributes setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.delete(
          `/indexes/${indexUid}/settings/searchable-attributes`
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
    "get-ranking-rules",
    {
      description: "Get the ranking rules setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.get(
          `/indexes/${indexUid}/settings/ranking-rules`
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
    "update-ranking-rules",
    {
      description: "Update the ranking rules setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
        rankingRules: z
          .string()
          .describe(
            'JSON array of ranking rules, e.g. ["typo", "words", "proximity", "attribute", "sort", "exactness"]'
          ),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid, rankingRules }) => {
      try {
        const response = await apiClient.put(
          `/indexes/${indexUid}/settings/ranking-rules`,
          rankingRules
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
    "reset-ranking-rules",
    {
      description: "Reset the ranking rules setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.delete(
          `/indexes/${indexUid}/settings/ranking-rules`
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
    "get-stop-words",
    {
      description: "Get the stop words setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.get(
          `/indexes/${indexUid}/settings/stop-words`
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
    "update-stop-words",
    {
      description: "Update the stop words setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
        stopWords: z
          .string()
          .describe(
            'JSON array of words to ignore in search queries, e.g. ["the", "a", "an"]'
          ),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid, stopWords }) => {
      try {
        const response = await apiClient.put(
          `/indexes/${indexUid}/settings/stop-words`,
          stopWords
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
    "reset-stop-words",
    {
      description: "Reset the stop words setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.delete(
          `/indexes/${indexUid}/settings/stop-words`
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
    "get-synonyms",
    {
      description: "Get the synonyms setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.get(
          `/indexes/${indexUid}/settings/synonyms`
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
    "update-synonyms",
    {
      description: "Update the synonyms setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
        synonyms: z
          .string()
          .describe(
            'JSON object mapping words to their synonyms, e.g. {"movie": ["film"]}'
          ),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid, synonyms }) => {
      try {
        const response = await apiClient.put(
          `/indexes/${indexUid}/settings/synonyms`,
          synonyms
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
    "reset-synonyms",
    {
      description: "Reset the synonyms setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.delete(
          `/indexes/${indexUid}/settings/synonyms`
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
    "get-typo-tolerance",
    {
      description: "Get the typo tolerance setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.get(
          `/indexes/${indexUid}/settings/typo-tolerance`
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
    "update-typo-tolerance",
    {
      description: "Update the typo tolerance setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
        typoTolerance: z
          .string()
          .describe(
            'JSON object with typo tolerance configuration, e.g. {"enabled": true, "minWordSizeForTypos": {"oneTypo": 5, "twoTypos": 9}}'
          ),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid, typoTolerance }) => {
      try {
        const response = await apiClient.put(
          `/indexes/${indexUid}/settings/typo-tolerance`,
          typoTolerance
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
    "reset-typo-tolerance",
    {
      description: "Reset the typo tolerance setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.delete(
          `/indexes/${indexUid}/settings/typo-tolerance`
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
    "get-pagination",
    {
      description: "Get the pagination setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.get(
          `/indexes/${indexUid}/settings/pagination`
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
    "update-pagination",
    {
      description: "Update the pagination setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
        pagination: z
          .string()
          .describe(
            'JSON object with pagination configuration, e.g. {"maxTotalHits": 1000}'
          ),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid, pagination }) => {
      try {
        const response = await apiClient.put(
          `/indexes/${indexUid}/settings/pagination`,
          pagination
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
    "reset-pagination",
    {
      description: "Reset the pagination setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.delete(
          `/indexes/${indexUid}/settings/pagination`
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
    "get-faceting",
    {
      description: "Get the faceting setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.get(
          `/indexes/${indexUid}/settings/faceting`
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
    "update-faceting",
    {
      description: "Update the faceting setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
        faceting: z
          .string()
          .describe(
            'JSON object with faceting configuration, e.g. {"maxValuesPerFacet": 100}'
          ),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid, faceting }) => {
      try {
        const response = await apiClient.put(
          `/indexes/${indexUid}/settings/faceting`,
          faceting
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
    "reset-faceting",
    {
      description: "Reset the faceting setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.delete(
          `/indexes/${indexUid}/settings/faceting`
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
    "get-dictionary",
    {
      description: "Get the dictionary setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.get(
          `/indexes/${indexUid}/settings/dictionary`
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
    "update-dictionary",
    {
      description: "Update the dictionary setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
        dictionary: z
          .string()
          .describe(
            'JSON array of words to consider as a single word, e.g. ["San Francisco", "New York"]'
          ),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid, dictionary }) => {
      try {
        const response = await apiClient.put(
          `/indexes/${indexUid}/settings/dictionary`,
          dictionary
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
    "reset-dictionary",
    {
      description: "Reset the dictionary setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.delete(
          `/indexes/${indexUid}/settings/dictionary`
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
    "get-proximity-precision",
    {
      description:
        "Get the proximity precision setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.get(
          `/indexes/${indexUid}/settings/proximity-precision`
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
    "update-proximity-precision",
    {
      description:
        "Update the proximity precision setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
        proximityPrecision: z
          .string()
          .describe(
            "String with proximity precision value, can be 'byWord' or 'byAttribute'"
          ),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid, proximityPrecision }) => {
      try {
        const response = await apiClient.put(
          `/indexes/${indexUid}/settings/proximity-precision`,
          proximityPrecision
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
    "reset-proximity-precision",
    {
      description:
        "Reset the proximity precision setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.delete(
          `/indexes/${indexUid}/settings/proximity-precision`
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
    "get-separator-tokens",
    {
      description: "Get the separator tokens setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.get(
          `/indexes/${indexUid}/settings/separator-tokens`
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
    "update-separator-tokens",
    {
      description:
        "Update the separator tokens setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
        separatorTokens: z
          .string()
          .describe(
            'JSON array of tokens that should be considered as word separators, e.g. ["-", "_"]'
          ),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid, separatorTokens }) => {
      try {
        const response = await apiClient.put(
          `/indexes/${indexUid}/settings/separator-tokens`,
          separatorTokens
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
    "reset-separator-tokens",
    {
      description: "Reset the separator tokens setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.delete(
          `/indexes/${indexUid}/settings/separator-tokens`
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
    "get-non-separator-tokens",
    {
      description:
        "Get the non-separator tokens setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.get(
          `/indexes/${indexUid}/settings/non-separator-tokens`
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
    "update-non-separator-tokens",
    {
      description:
        "Update the non-separator tokens setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
        nonSeparatorTokens: z
          .string()
          .describe(
            'JSON array of tokens that should not be considered as word separators, e.g. ["@", "."]'
          ),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid, nonSeparatorTokens }) => {
      try {
        const response = await apiClient.put(
          `/indexes/${indexUid}/settings/non-separator-tokens`,
          nonSeparatorTokens
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
    "reset-non-separator-tokens",
    {
      description:
        "Reset the non-separator tokens setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.delete(
          `/indexes/${indexUid}/settings/non-separator-tokens`
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
    "get-word-dictionary",
    {
      description: "Get the word dictionary setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.get(
          `/indexes/${indexUid}/settings/word-dictionary`
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
    "update-word-dictionary",
    {
      description: "Update the word dictionary setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
        wordDictionary: z
          .string()
          .describe(
            'JSON array of custom words to add to the dictionary, e.g. ["cbuilder", "meilisearch"]'
          ),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid, wordDictionary }) => {
      try {
        const response = await apiClient.put(
          `/indexes/${indexUid}/settings/word-dictionary`,
          wordDictionary
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
    "reset-word-dictionary",
    {
      description: "Reset the word dictionary setting for a Meilisearch index",
      inputSchema: {
        indexUid: z.string().describe("Unique identifier of the index"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ indexUid }) => {
      try {
        const response = await apiClient.delete(
          `/indexes/${indexUid}/settings/word-dictionary`
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

export default registerSettingsTools;
