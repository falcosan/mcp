import { resolve } from "node:path";
import { build, Plugin } from "vite";

export const mcpBuilderPlugin = (): Plugin => ({
  name: "mcp-builder-plugin",
  apply: "build",
  enforce: "post",
  async closeBundle() {
    await build({
      logLevel: "info",
      publicDir: false,
      configFile: false,
      optimizeDeps: { exclude: ["mcp-meilisearch"] },
      build: {
        ssr: true,
        sourcemap: true,
        target: "esnext",
        outDir: "dist/mcp",
        emptyOutDir: false,
        rollupOptions: {
          input: resolve(process.cwd(), "mcp/index.js"),
          output: { format: "esm", entryFileNames: "index.js" },
        },
      },
    });
  },
});
