import http from "node:http";
import { createServer } from "node:http";
import { initServer } from "./server.js";
import { createRequire } from "node:module";
import { parse as parseUrl } from "node:url";
import { configHandler } from "./utils/config-handler.js";
import { createErrorResponse } from "./utils/error-handler.js";

interface StandaloneServerOptions {
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
   * Session timeout in milliseconds
   * @default 3600000 (1 hour)
   */
  sessionTimeout?: number;

  /**
   * Session cleanup interval in milliseconds
   * @default 60000 (1 minute)
   */
  sessionCleanupInterval?: number;

  /**
   * The URL of the Meilisearch instance
   * @default "http://localhost:7700"
   */
  meilisearchHost: string;

  /**
   * The API key for authenticating with Meilisearch
   * @default ""
   */
  meilisearchApiKey: string;
}

/**
 * Start a standalone MCP server (without Vite)
 * @param options Configuration options for the MCP server
 * @returns A promise that resolves to the HTTP server instance
 */
export async function startStandaloneServer(
  options: StandaloneServerOptions = {
    meilisearchApiKey: "",
    meilisearchHost: "http://localhost:7700",
  }
): Promise<http.Server> {
  configHandler.setMeilisearchHost(options.meilisearchHost);
  configHandler.setMeilisearchApiKey(options.meilisearchApiKey);

  let mcpServerInstance: any = null;

  const httpPort = options.httpPort || 8080;
  const mcpEndpoint = options.mcpEndpoint || "/mcp";
  const server = createServer(async (req, res) => {
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

    const parsedUrl = parseUrl(req.url || "/", true);
    const pathname = parsedUrl.pathname || "/";

    if (pathname.startsWith(mcpEndpoint)) {
      if (!mcpServerInstance) {
        console.error("MCP server not initialized yet");
        res.statusCode = 503;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify(createErrorResponse("MCP server not initialized yet"))
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
            res.end(JSON.stringify(createErrorResponse("Invalid JSON body")));
          }
        });
      } else {
        res.statusCode = 405;
        res.end(JSON.stringify(createErrorResponse("Method not allowed")));
      }
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "Not found" }));
    }
  });

  // Initialize the MCP server when the HTTP server starts
  await new Promise<void>((resolve) => {
    server.listen(httpPort, () => {
      console.log(`Standalone MCP server listening on port ${httpPort}`);
      resolve();
    });
  });

  try {
    console.log("Initializing MCP server...");
    const serverInstances = await initServer("http", options);
    mcpServerInstance = serverInstances.mcpServer;
    console.log("MCP server initialized successfully");
  } catch (error) {
    console.error("Failed to initialize MCP server:", error);
    server.close();
    throw error;
  }

  const shutdownHandler = () => {
    console.log("Shutting down MCP server...");
    if (mcpServerInstance && typeof mcpServerInstance.shutdown === "function") {
      try {
        mcpServerInstance.shutdown();
      } catch (error) {
        console.error("Error shutting down MCP server:", error);
      }
    }
    server.close();
  };

  process.on("SIGINT", shutdownHandler);
  process.on("SIGTERM", shutdownHandler);

  return server;
}

if (createRequire(import.meta.url).main === module) {
  const args = process.argv.slice(2);
  const options: StandaloneServerOptions = {
    meilisearchHost: "http://localhost:7700",
    meilisearchApiKey: "",
  };

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace("--", "");
    const value = args[i + 1];

    switch (key) {
      case "port":
        options.httpPort = parseInt(value, 10);
        break;
      case "endpoint":
        options.mcpEndpoint = value;
        break;
      case "host":
        options.meilisearchHost = value;
        break;
      case "apiKey":
        options.meilisearchApiKey = value;
        break;
    }
  }

  startStandaloneServer(options)
    .then(() => console.log("Standalone MCP server running"))
    .catch((err) => {
      console.error("Failed to start standalone server:", err);
      process.exit(1);
    });
}

export default startStandaloneServer;
