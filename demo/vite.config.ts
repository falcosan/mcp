import vue from "@vitejs/plugin-vue";
import builder from "vite-plugin-builder";
import { loadEnv, defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
  return {
    plugins: [
      vue(),
      builder({
        serverEntry: "mcp/index.js",
        serverConfig: {
          outDir: "dist/mcp",
          output: {
            entryFileNames: "index.js",
          },
        },
      }),
    ],
    build: {
      outDir: "dist/public",
    },
    preview: {
      port: 8080,
    },
    server: {
      port: 8080,
    },
  };
});
