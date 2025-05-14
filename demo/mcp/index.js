import { mcpMeilisearchServer } from "../../dist/index.js";

mcpMeilisearchServer({
  meilisearchHost: process.env.MEILISEARCH_HOST,
  meilisearchApiKey: process.env.MEILISEARCH_API_KEY,
});
