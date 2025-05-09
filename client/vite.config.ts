import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { mcpPlugin } from "../src/index.js";

export default defineConfig({
  plugins: [
    vue(),
    mcpPlugin({
      httpPort: 8080,
      transport: "http",
      mcpEndpoint: "/mcp",
      meilisearchHost: "",
      meilisearchApiKey: "",
    }),
  ],
  preview: {
    port: 8080,
  },
  server: {
    port: 8080,
  },
});
