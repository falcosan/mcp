import { mcpMeilisearchServer } from "./index.js";

mcpMeilisearchServer({
  transport: "stdio",
  meilisearchHost: process.env.VITE_MEILISEARCH_HOST!,
  meilisearchApiKey: process.env.VITE_MEILISEARCH_API_KEY!,
});
