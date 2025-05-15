import http from "node:http";
import { createServer } from "node:http";
import { parse as parseUrl } from "node:url";
import { AIService } from "./utils/ai-handler.js";
import { initServer, MCPServer } from "./server.js";
import { configHandler } from "./utils/config-handler.js";
import { createErrorResponse } from "./utils/error-handler.js";
import { AiProviderNameOptions, ServerOptions } from "./types/options.js";

const defaultOptions: ServerOptions = {
  aiProviderApiKey: "",
  meilisearchApiKey: "",
  llmModel: "gpt-3.5-turbo",
  aiProviderName: "openai",
  meilisearchHost: "http://localhost:7700",
};

/**
 * Start a MCP server
 * @param options Configuration options for the MCP server
 * @returns A promise that resolves to the HTTP server instance
 */
export async function mcpMeilisearchServer(
  options: ServerOptions = defaultOptions
): Promise<http.Server> {
  configHandler.setLlmModel(options.llmModel);
  configHandler.setAiProviderName(options.aiProviderName);
  configHandler.setMeilisearchHost(options.meilisearchHost);
  configHandler.setAiProviderApiKey(options.aiProviderApiKey);
  configHandler.setMeilisearchApiKey(options.meilisearchApiKey);

  const aiService = AIService.getInstance();
  const apiKey = configHandler.getAiProviderApiKey();

  if (apiKey) {
    const llmModel = configHandler.getLlmModel();
    const aiProviderName = configHandler.getAiProviderName();
    aiService.initialize(apiKey, aiProviderName, llmModel);
  } else {
    console.warn("AI provider API key not found. AI will not be available");
  }

  const httpPort = options.httpPort || 4995;
  const transport = options.transport || "http";
  let mcpServerInstance: MCPServer | null = null;
  const mcpEndpoint = options.mcpEndpoint || "/mcp";

  const server = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, mcp-session-id"
    );

    if (req.method === "OPTIONS") {
      res.statusCode = 200;
      res.end();
      return;
    }

    const parsedUrl = parseUrl(req.url || "/", true);
    const pathname = parsedUrl.pathname || "/";

    if (!pathname.startsWith(mcpEndpoint)) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

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
      return;
    }

    if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", async () => {
        try {
          const jsonBody = JSON.parse(body);
          if (mcpServerInstance) {
            await mcpServerInstance.handlePostRequest(req, res, jsonBody);
          } else {
            res.statusCode = 503;
            res.end(
              JSON.stringify(
                createErrorResponse("MCP server not initialized yet")
              )
            );
          }
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify(createErrorResponse("Invalid JSON body")));
        }
      });
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify(createErrorResponse("Method not allowed")));
  });

  await new Promise<void>((resolve) => {
    server.listen(httpPort, () => {
      console.log(`MCP server listening on port ${httpPort}`);
      resolve();
    });
  });

  try {
    const serverInstances = await initServer(transport, options);
    mcpServerInstance = serverInstances.mcpServer;
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

if (import.meta.url === `file://${process.argv?.[1]}`) {
  const args = process.argv.slice(2);
  const options: ServerOptions = defaultOptions;
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
      case "aiApiKey":
        options.aiProviderApiKey = value;
      case "aiProvider":
        options.aiProviderName = value as AiProviderNameOptions;
        break;
      case "llmModel":
        options.llmModel = value;
        break;
    }
  }
  mcpMeilisearchServer(options)
    .then(() => console.log("MCP server running"))
    .catch((err) => {
      console.error("Failed to start server:", err);
      process.exit(1);
    });
}

export default mcpMeilisearchServer;
