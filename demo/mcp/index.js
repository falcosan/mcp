import { mcpMeilisearchServer } from "../../dist/index.js";

await mcpMeilisearchServer({
  llmModel: "gpt-4o-mini",
  meilisearchHost: process.env.VITE_MEILISEARCH_HOST,
  aiProviderApiKey: process.env.VITE_AI_PROVIDER_API_KEY,
  meilisearchApiKey: process.env.VITE_MEILISEARCH_API_KEY,
});
