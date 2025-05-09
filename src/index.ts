import { Plugin } from "vite";
import { initServer } from "./server.js";
import { randomUUID } from "node:crypto";
import { createErrorResponse } from "./utils/error-handler.js";

/**
 * Options for the MCP Vite plugin
 */
export interface MCPPluginOptions {
  /**
   * Transport type for MCP server ("http" | "stdio")
   * @default "http"
   */
  transport?: "http" | "stdio";

  /**
   * HTTP port for MCP server
   * @default 8080
   */
  httpPort?: number;

  /**
   * MCP endpoint path
   * @default "/mcp"
   */
  mcpEndpoint?: string;

  /**
   * Server name
   * @default "meilisearch"
   */
  serverName?: string;

  /**
   * Server version
   * @default "1.0.0"
   */
  serverVersion?: string;

  /**
   * Session timeout in milliseconds
   * @default 3600000 (1 hour)
   */
  sessionTimeout?: number;

  /**
   * Session cleanup interval in milliseconds
   * @default 60000 (1 minute)
   */
  sessionCleanupInterval?: number;
}

/**
 * Creates a Vite plugin that integrates with the MCP server
 * @param options Configuration options for the MCP server
 * @returns A Vite plugin
 */
export function mcpPlugin(options: MCPPluginOptions = {}): Plugin {
  const pluginId = `mcp-plugin-${randomUUID().slice(0, 8)}`;
  let mcpServerInstance: any = null;

  // Set default options
  const transport = options.transport || "http";

  return {
    name: "vite:mcp-plugin",
    apply: "serve", // Only apply this plugin during development

    configureServer(server) {
      // Store the custom config in Vite's server context for sharing
      server.config.env.VITE_MCP_PLUGIN_ID = pluginId;

      // Configure process.env variables with MCP server options
      if (options.httpPort)
        process.env.MCP_HTTP_PORT = String(options.httpPort);
      if (options.mcpEndpoint) process.env.MCP_ENDPOINT = options.mcpEndpoint;
      if (options.serverName) process.env.MCP_SERVER_NAME = options.serverName;
      if (options.serverVersion)
        process.env.MCP_SERVER_VERSION = options.serverVersion;
      if (options.sessionTimeout)
        process.env.MCP_SESSION_TIMEOUT = String(options.sessionTimeout);
      if (options.sessionCleanupInterval)
        process.env.MCP_SESSION_CLEANUP_INTERVAL = String(
          options.sessionCleanupInterval
        );

      // Add CORS middleware
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

      // Handle MCP endpoint requests
      server.middlewares.use(async (req, res, next) => {
        const mcpEndpoint = options.mcpEndpoint || "/mcp";
        const url = req.url || "/";

        if (url.startsWith(mcpEndpoint)) {
          // Only proceed if MCP server is initialized
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
          // Initialize the MCP server
          const serverInstances = await initServer(transport);
          mcpServerInstance = serverInstances.mcpServer;
        } catch (error) {
          console.error("Failed to initialize MCP server:", error);
        }
      });
    },

    closeBundle() {
      // Clean up resources when Vite is shutting down
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

/**
 * Default export for convenience
 */
export default mcpPlugin;
