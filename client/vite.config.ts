import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { mcpPlugin } from "../src/index.js";

export default defineConfig({
  plugins: [
    vue(),
    mcpPlugin({
      transport: "http",
      mcpEndpoint: "/mcp",
      serverName: "meilisearch",
      serverVersion: "1.0.0",
    }),
  ],
  preview: {
    port: 8000,
  },
});
