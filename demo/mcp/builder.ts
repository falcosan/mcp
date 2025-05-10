import path from "node:path";
import { build, Plugin } from "vite";

export const mcpBuilderPlugin = (): Plugin => ({
  name: "mcp-builder-plugin",
  apply: "build",
  enforce: "post",
  closeBundle: {
    sequential: true,
    order: "post",
    handler: async () => {
      await build({
        logLevel: "info",
        publicDir: false,
        configFile: false,
        optimizeDeps: { exclude: ["mcp-meilisearch"] },
        build: {
          ssr: true,
          minify: false,
          target: "esnext",
          outDir: "dist/mcp",
          emptyOutDir: false,
          commonjsOptions: { include: [/node_modules/] },
          rollupOptions: {
            input: path.resolve(process.cwd(), "mcp/index.js"),
            output: { format: "esm", entryFileNames: "index.js" },
            external: [/^@\/.*$/, /^vue$/, /^vue-router$/, /^vue-i18n$/],
          },
        },
      });
    },
  },
});
