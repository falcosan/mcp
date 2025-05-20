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
  server.tool(
    "get-settings",
    "Get all settings for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Update all settings for an index
  server.tool(
    "update-settings",
    "Update all settings for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
      settings: z
        .string()
        .describe("JSON object containing settings to update"),
    },
    { category: "meilisearch" },
    async ({ indexUid, settings }) => {
      try {
        // Parse the settings string to ensure it's valid JSON
        const parsedSettings = JSON.parse(settings);

        // Ensure settings is an object
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

  // Reset all settings for an index
  server.tool(
    "reset-settings",
    "Reset all settings for a Meilisearch index to their default values",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Get displayed attributes setting
  server.tool(
    "get-displayed-attributes",
    "Get the displayed attributes setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Update displayed attributes setting
  server.tool(
    "update-displayed-attributes",
    "Update the displayed attributes setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
      displayedAttributes: z
        .string()
        .describe(
          'JSON array of attributes to display, e.g. ["title", "description"]'
        ),
    },
    { category: "meilisearch" },
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

  // Reset displayed attributes setting
  server.tool(
    "reset-displayed-attributes",
    "Reset the displayed attributes setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Get filterable attributes setting
  server.tool(
    "get-filterable-attributes",
    "Get the filterable attributes setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Update filterable attributes setting
  server.tool(
    "update-filterable-attributes",
    "Update the filterable attributes setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
      filterableAttributes: z
        .string()
        .describe(
          'JSON array of attributes that can be used as filters, e.g. ["genre", "director"]'
        ),
    },
    { category: "meilisearch" },
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

  // Reset filterable attributes setting
  server.tool(
    "reset-filterable-attributes",
    "Reset the filterable attributes setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Get sortable attributes setting
  server.tool(
    "get-sortable-attributes",
    "Get the sortable attributes setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Update sortable attributes setting
  server.tool(
    "update-sortable-attributes",
    "Update the sortable attributes setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
      sortableAttributes: z
        .string()
        .describe(
          'JSON array of attributes that can be used for sorting, e.g. ["price", "date"]'
        ),
    },
    { category: "meilisearch" },
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

  // Reset sortable attributes setting
  server.tool(
    "reset-sortable-attributes",
    "Reset the sortable attributes setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Get searchable attributes setting
  server.tool(
    "get-searchable-attributes",
    "Get the searchable attributes setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Update searchable attributes setting
  server.tool(
    "update-searchable-attributes",
    "Update the searchable attributes setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
      searchableAttributes: z
        .string()
        .describe(
          'JSON array of attributes that can be searched, e.g. ["title", "description"]'
        ),
    },
    { category: "meilisearch" },
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

  // Reset searchable attributes setting
  server.tool(
    "reset-searchable-attributes",
    "Reset the searchable attributes setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Get ranking rules setting
  server.tool(
    "get-ranking-rules",
    "Get the ranking rules setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Update ranking rules setting
  server.tool(
    "update-ranking-rules",
    "Update the ranking rules setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
      rankingRules: z
        .string()
        .describe(
          'JSON array of ranking rules, e.g. ["typo", "words", "proximity", "attribute", "sort", "exactness"]'
        ),
    },
    { category: "meilisearch" },
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

  // Reset ranking rules setting
  server.tool(
    "reset-ranking-rules",
    "Reset the ranking rules setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Get stop words setting
  server.tool(
    "get-stop-words",
    "Get the stop words setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Update stop words setting
  server.tool(
    "update-stop-words",
    "Update the stop words setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
      stopWords: z
        .string()
        .describe(
          'JSON array of words to ignore in search queries, e.g. ["the", "a", "an"]'
        ),
    },
    { category: "meilisearch" },
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

  // Reset stop words setting
  server.tool(
    "reset-stop-words",
    "Reset the stop words setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Get synonyms setting
  server.tool(
    "get-synonyms",
    "Get the synonyms setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Update synonyms setting
  server.tool(
    "update-synonyms",
    "Update the synonyms setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
      synonyms: z
        .string()
        .describe(
          'JSON object mapping words to their synonyms, e.g. {"movie": ["film"]}'
        ),
    },
    { category: "meilisearch" },
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

  // Reset synonyms setting
  server.tool(
    "reset-synonyms",
    "Reset the synonyms setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Get typo tolerance setting
  server.tool(
    "get-typo-tolerance",
    "Get the typo tolerance setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Update typo tolerance setting
  server.tool(
    "update-typo-tolerance",
    "Update the typo tolerance setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
      typoTolerance: z
        .string()
        .describe(
          'JSON object with typo tolerance configuration, e.g. {"enabled": true, "minWordSizeForTypos": {"oneTypo": 5, "twoTypos": 9}}'
        ),
    },
    { category: "meilisearch" },
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

  // Reset typo tolerance setting
  server.tool(
    "reset-typo-tolerance",
    "Reset the typo tolerance setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Get pagination setting
  server.tool(
    "get-pagination",
    "Get the pagination setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Update pagination setting
  server.tool(
    "update-pagination",
    "Update the pagination setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
      pagination: z
        .string()
        .describe(
          'JSON object with pagination configuration, e.g. {"maxTotalHits": 1000}'
        ),
    },
    { category: "meilisearch" },
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

  // Reset pagination setting
  server.tool(
    "reset-pagination",
    "Reset the pagination setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Get faceting setting
  server.tool(
    "get-faceting",
    "Get the faceting setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Update faceting setting
  server.tool(
    "update-faceting",
    "Update the faceting setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
      faceting: z
        .string()
        .describe(
          'JSON object with faceting configuration, e.g. {"maxValuesPerFacet": 100}'
        ),
    },
    { category: "meilisearch" },
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

  // Reset faceting setting
  server.tool(
    "reset-faceting",
    "Reset the faceting setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Get dictionary setting
  server.tool(
    "get-dictionary",
    "Get the dictionary setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Update dictionary setting
  server.tool(
    "update-dictionary",
    "Update the dictionary setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
      dictionary: z
        .string()
        .describe(
          'JSON array of words to consider as a single word, e.g. ["San Francisco", "New York"]'
        ),
    },
    { category: "meilisearch" },
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

  // Reset dictionary setting
  server.tool(
    "reset-dictionary",
    "Reset the dictionary setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Get proximity precision setting
  server.tool(
    "get-proximity-precision",
    "Get the proximity precision setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Update proximity precision setting
  server.tool(
    "update-proximity-precision",
    "Update the proximity precision setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
      proximityPrecision: z
        .string()
        .describe(
          "String with proximity precision value, can be 'byWord' or 'byAttribute'"
        ),
    },
    { category: "meilisearch" },
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

  // Reset proximity precision setting
  server.tool(
    "reset-proximity-precision",
    "Reset the proximity precision setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Get separator tokens setting
  server.tool(
    "get-separator-tokens",
    "Get the separator tokens setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Update separator tokens setting
  server.tool(
    "update-separator-tokens",
    "Update the separator tokens setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
      separatorTokens: z
        .string()
        .describe(
          'JSON array of tokens that should be considered as word separators, e.g. ["-", "_"]'
        ),
    },
    { category: "meilisearch" },
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

  // Reset separator tokens setting
  server.tool(
    "reset-separator-tokens",
    "Reset the separator tokens setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Get non-separator tokens setting
  server.tool(
    "get-non-separator-tokens",
    "Get the non-separator tokens setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Update non-separator tokens setting
  server.tool(
    "update-non-separator-tokens",
    "Update the non-separator tokens setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
      nonSeparatorTokens: z
        .string()
        .describe(
          'JSON array of tokens that should not be considered as word separators, e.g. ["@", "."]'
        ),
    },
    { category: "meilisearch" },
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

  // Reset non-separator tokens setting
  server.tool(
    "reset-non-separator-tokens",
    "Reset the non-separator tokens setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Get word dictionary setting
  server.tool(
    "get-word-dictionary",
    "Get the word dictionary setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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

  // Update word dictionary setting
  server.tool(
    "update-word-dictionary",
    "Update the word dictionary setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
      wordDictionary: z
        .string()
        .describe(
          'JSON array of custom words to add to the dictionary, e.g. ["cbuilder", "meilisearch"]'
        ),
    },
    { category: "meilisearch" },
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

  // Reset word dictionary setting
  server.tool(
    "reset-word-dictionary",
    "Reset the word dictionary setting for a Meilisearch index",
    {
      indexUid: z.string().describe("Unique identifier of the index"),
    },
    { category: "meilisearch" },
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
