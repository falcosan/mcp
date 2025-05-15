import { mcpMeilisearchServer } from "../../dist/index.js";

mcpMeilisearchServer({
  llmModel: "mistralai/mistral-7b-instruct:free",
  meilisearchHost: process.env.VITE_MEILISEARCH_HOST,
  aiProviderApiKey: process.env.VITE_AI_PROVIDER_API_KEY,
  meilisearchApiKey: process.env.VITE_MEILISEARCH_API_KEY,
});
