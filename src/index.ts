import http from "node:http";
import { createServer } from "node:http";
import { AIService } from "./utils/ai-handler.js";
import { configHandler } from "./utils/config-handler.js";
import { initServer, MCPServer, defaultOptions } from "./server.js";
import { ServerOptions, AiProviderNameOptions } from "./types/options.js";

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
    console.warn("AI provider API key not found. Continuing without it.");
  }

  let mcpServerInstance: MCPServer | null = null;

  const transport = options.transport;
  const mcpEndpoint = options.mcpEndpoint;
  const httpPort = options.httpPort || defaultOptions.httpPort;

  const server = createServer(async (req, res) => {
    if (!mcpServerInstance) {
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "MCP server not initialized yet" }));
      return;
    }

    await mcpServerInstance.handleHttpRequest(req, res, mcpEndpoint);
  });

  await new Promise<void>((resolve) => {
    server.listen(httpPort, () => {
      console.info(`MCP server listening on port ${httpPort}`);
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
    console.info("Shutting down MCP server...");
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
        break;
      case "aiProvider":
        options.aiProviderName = value as AiProviderNameOptions;
        break;
      case "llmModel":
        options.llmModel = value;
        break;
    }
  }
  await mcpMeilisearchServer(options)
    .then(() => console.info("MCP server running"))
    .catch((err) => {
      console.error("Failed to start server:", err);
      process.exit(1);
    });
}

export default mcpMeilisearchServer;
