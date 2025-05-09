import vue from "@vitejs/plugin-vue";
import { mcpPlugin } from "../src/index.js";
import { loadEnv, defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, "./") };
  return {
    plugins: [
      vue(),
      mcpPlugin({
        httpPort: 8080,
        transport: "http",
        mcpEndpoint: "/mcp",
        meilisearchHost: process.env.VITE_MEILISEARCH_HOST as string,
        meilisearchApiKey: process.env.VITE_MEILISEARCH_API_KEY as string,
      }),
    ],
    preview: {
      port: 8080,
    },
    server: {
      port: 8080,
    },
  };
});
