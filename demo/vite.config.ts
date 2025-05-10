import vue from "@vitejs/plugin-vue";
import { loadEnv, defineConfig } from "vite";
import { mcpBuilderPlugin } from "./mcp/builder";

export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
  return {
    plugins: [vue(), mcpBuilderPlugin()],
    preview: {
      port: 8080,
    },
    server: {
      port: 8080,
    },
  };
});
