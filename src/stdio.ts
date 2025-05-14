import { mcpMeilisearchServer } from "./index.js";

mcpMeilisearchServer({
  transport: "stdio",
  meilisearchHost: process.env.MEILISEARCH_HOST!,
  meilisearchApiKey: process.env.MEILISEARCH_API_KEY!,
});
