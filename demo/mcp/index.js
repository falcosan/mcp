import { mcpMeilisearchServer } from "mcp-meilisearch";

mcpMeilisearchServer({
  httpPort: process.env.VITE_MCP_PORT,
  meilisearchHost: process.env.VITE_MEILISEARCH_HOST,
  meilisearchApiKey: process.env.VITE_MEILISEARCH_API_KEY,
});
