import { mcpMeilisearchServer } from "mcp-meilisearch";

mcpMeilisearchServer({
  meilisearchHost: process.env.VITE_MEILISEARCH_HOST,
  meilisearchApiKey: process.env.VITE_MEILISEARCH_API_KEY,
});
