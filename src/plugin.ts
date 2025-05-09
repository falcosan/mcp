import { Plugin } from "vite";
import { initServer } from "./server.js";
import { ServerOptions } from "./types/options.js";
import { configHandler } from "./utils/config-handler.js";
import { createErrorResponse } from "./utils/error-handler.js";

/**
 * Creates a Vite plugin that integrates with the MCP server
 * @param options Configuration options for the MCP server
 * @returns A Vite plugin
 */
export function mcpPlugin(
  options: ServerOptions = {
    meilisearchApiKey: "",
    meilisearchHost: "http://localhost:7700",
  }
): Plugin {
  configHandler.setMeilisearchHost(options.meilisearchHost);
  configHandler.setMeilisearchApiKey(options.meilisearchApiKey);

  let mcpServerInstance: any = null;

  const transport = options.transport || "http";
  return {
    name: "vite:mcp-plugin",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader(
          "Access-Control-Allow-Headers",
          `Origin, X-Requested-With, Content-Type, Accept, mcp-session-id`
        );

        if (req.method === "OPTIONS") {
          res.statusCode = 200;
          res.end();
          return;
        }

        next();
      });

      server.middlewares.use(async (req, res, next) => {
        const mcpEndpoint = options.mcpEndpoint || "/mcp";
        const url = req.url || "/";

        if (url.startsWith(mcpEndpoint)) {
          if (!mcpServerInstance) {
            console.error("MCP server not initialized yet");
            res.statusCode = 503;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify(
                createErrorResponse("MCP server not initialized yet")
              )
            );
            return;
          }

          if (req.method === "GET") {
            await mcpServerInstance.handleGetRequest(req, res);
          } else if (req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => {
              body += chunk.toString();
            });

            req.on("end", async () => {
              try {
                const jsonBody = JSON.parse(body);
                await mcpServerInstance.handlePostRequest(req, res, jsonBody);
              } catch (error) {
                console.error("Error parsing request body:", error);
                res.statusCode = 400;
                res.end(
                  JSON.stringify(createErrorResponse("Invalid JSON body"))
                );
              }
            });
          } else {
            next();
          }
        } else {
          next();
        }
      });

      // Start the MCP server when Vite server is ready
      server.httpServer?.on("listening", async () => {
        console.log(
          `Vite server is ready, initializing MCP server with ${transport} transport`
        );

        try {
          const serverInstances = await initServer(transport, options);
          mcpServerInstance = serverInstances.mcpServer;
        } catch (error) {
          console.error("Failed to initialize MCP server:", error);
        }
      });
    },

    closeBundle() {
      if (mcpServerInstance) {
        try {
          console.log("Shutting down MCP server...");
          if (typeof mcpServerInstance.shutdown === "function") {
            mcpServerInstance.shutdown();
          }
        } catch (error) {
          console.error("Error shutting down MCP server:", error);
        }
      }
    },
  };
}
