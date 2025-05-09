import { randomUUID } from "node:crypto";
import { IncomingMessage, ServerResponse } from "http";
import { createServer as createViteServer } from "vite";
import {
  Notification,
  JSONRPCNotification,
  InitializeRequestSchema,
  ToolListChangedNotification,
} from "@modelcontextprotocol/sdk/types.js";
import registerTaskTools from "./tools/task-tools.js";
import registerIndexTools from "./tools/index-tools.js";
import registerSearchTools from "./tools/search-tools.js";
import registerSystemTools from "./tools/system-tools.js";
import registerVectorTools from "./tools/vector-tools.js";
import registerDocumentTools from "./tools/document-tools.js";
import registerSettingsTools from "./tools/settings-tools.js";
import { createErrorResponse } from "./utils/error-handler.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

/**
 * Configuration for the MCP server
 */
interface ServerConfig {
  httpPort: number;
  mcpEndpoint: string;
  serverName: string;
  serverVersion: string;
  sessionTimeout: number;
  sessionCleanupInterval: number;
}

const DEFAULT_CONFIG: ServerConfig = {
  httpPort: 8080,
  mcpEndpoint: "/mcp",
  serverName: "meilisearch",
  serverVersion: "1.0.0",
  sessionCleanupInterval: 60000, // 1 minute
  sessionTimeout: 3600000, // 1 hour
};

/**
 * Information about an active transport session
 */
interface SessionInfo {
  transport: StreamableHTTPServerTransport;
  lastActivity: number;
}

/**
 * Implementation of an MCP server for Meilisearch
 */
class MCPServer {
  private readonly JSON_RPC = "2.0";
  private readonly SESSION_ID_HEADER_NAME = "mcp-session-id";

  private server: McpServer;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private sessions: Map<string, SessionInfo> = new Map();
  private config: ServerConfig;

  /**
   * Creates a new MCP server instance
   * @param server The underlying MCP server implementation
   * @param config Configuration options
   */
  constructor(server: McpServer, config: Partial<ServerConfig> = {}) {
    this.server = server;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Start session cleanup if using HTTP transport
    this.startSessionCleanup();
  }

  /**
   * Handles an HTTP GET request
   * @param req The HTTP request
   * @param res The HTTP response
   */
  async handleGetRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    console.log("GET request received");

    const sessionId = this.extractSessionId(req);
    if (!sessionId || !this.sessions.has(sessionId)) {
      console.error(`Invalid session ID: ${sessionId}`);
      this.sendErrorResponse(res, 400, "Bad Request: invalid session ID");
      return;
    }

    console.log(`Establishing HTTP stream for session ${sessionId}`);
    const sessionInfo = this.sessions.get(sessionId)!;
    const transport = sessionInfo.transport;

    try {
      await transport.handleRequest(req, res);
      this.updateSessionActivity(sessionId);

      this.sendNotification(transport, {
        method: "notifications/message",
        params: { level: "info", data: "HTTP Connection established" },
      });
    } catch (error) {
      console.error(
        `Error handling GET request for session ${sessionId}:`,
        error
      );
      this.sendErrorResponse(res, 500, `Internal server error: ${error}`);
    }
  }

  /**
   * Handles an HTTP POST request (executes MCP commands)
   * @param req The HTTP request
   * @param res The HTTP response
   * @param body The request body
   */
  async handlePostRequest(
    req: IncomingMessage,
    res: ServerResponse,
    body: any
  ): Promise<void> {
    const sessionId = this.extractSessionId(req);

    try {
      // Case 1: Existing session
      if (sessionId && this.sessions.has(sessionId)) {
        console.log(`POST request for existing session ${sessionId}`);
        const sessionInfo = this.sessions.get(sessionId)!;
        await sessionInfo.transport.handleRequest(req, res, body);
        this.updateSessionActivity(sessionId);
        return;
      }

      // Case 2: Initialize request
      if (!sessionId && this.isInitializeRequest(body)) {
        await this.handleInitializeRequest(req, res, body);
        return;
      }

      // Case 3: Invalid request
      console.error(
        "Invalid request: missing session ID or not an initialize request"
      );
      this.sendErrorResponse(
        res,
        400,
        "Bad Request: invalid session ID or not an initialize request"
      );
    } catch (error) {
      console.error("Error handling MCP request:", error);
      this.sendErrorResponse(res, 500, `Internal server error: ${error}`);
    }
  }

  /**
   * Clean up and release server resources
   */
  shutdown(): void {
    console.log("Shutting down MCP server...");

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all active sessions
    for (const [sessionId, sessionInfo] of this.sessions.entries()) {
      try {
        console.log(`Closing session ${sessionId}`);
        sessionInfo.transport.close();
      } catch (error) {
        console.error(`Error closing session ${sessionId}:`, error);
      }
    }

    this.sessions.clear();
    console.log("MCP server shutdown complete");
  }

  /**
   * Handles the initial connection request
   * @param req The HTTP request
   * @param res The HTTP response
   * @param body The request body
   */
  private async handleInitializeRequest(
    req: IncomingMessage,
    res: ServerResponse,
    body: any
  ): Promise<void> {
    console.log("Handling initialize request");
    const newSessionId = randomUUID();

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
    });

    transport.sessionId = newSessionId;

    try {
      // Connect the transport to the MCP server
      await this.server.connect(transport);

      // Set response headers
      res.setHeader(this.SESSION_ID_HEADER_NAME, newSessionId);
      res.setHeader(
        "Access-Control-Expose-Headers",
        this.SESSION_ID_HEADER_NAME
      );

      // Handle the initialize request
      await transport.handleRequest(req, res, body);

      // Register the session
      this.sessions.set(newSessionId, {
        transport,
        lastActivity: Date.now(),
      });

      // Notify client about available tools
      this.sendToolListChangedNotification(transport);

      console.log(`New session established: ${newSessionId}`);
    } catch (error) {
      console.error("Error handling initialize request:", error);
      transport.close();
      this.sendErrorResponse(res, 500, `Failed to initialize: ${error}`);
    }
  }

  /**
   * Sends a notification about tool list changes
   */
  private sendToolListChangedNotification(
    transport: StreamableHTTPServerTransport
  ): void {
    const notification: ToolListChangedNotification = {
      method: "notifications/tools/list_changed",
      params: {},
    };

    this.sendNotification(transport, notification);
  }

  /**
   * Sends a notification through the transport
   */
  private async sendNotification(
    transport: StreamableHTTPServerTransport,
    notification: Notification
  ): Promise<void> {
    try {
      const rpcNotification: JSONRPCNotification = {
        ...notification,
        jsonrpc: this.JSON_RPC,
      };
      await transport.send(rpcNotification);
      console.log(`Sent notification: ${notification.method}`);
    } catch (error) {
      console.error(
        `Failed to send notification ${notification.method}:`,
        error
      );
    }
  }

  /**
   * Checks if the request body represents an initialize request
   */
  private isInitializeRequest(body: any): boolean {
    const isInitial = (data: any) => {
      const result = InitializeRequestSchema.safeParse(data);
      return result.success;
    };

    if (Array.isArray(body)) {
      return body.some(isInitial);
    }

    return isInitial(body);
  }

  /**
   * Extracts session ID from request headers
   */
  private extractSessionId(req: IncomingMessage): string | undefined {
    const headerValue = req.headers[this.SESSION_ID_HEADER_NAME.toLowerCase()];
    return Array.isArray(headerValue) ? headerValue[0] : headerValue;
  }

  /**
   * Updates the activity timestamp for a session
   */
  private updateSessionActivity(sessionId: string): void {
    const sessionInfo = this.sessions.get(sessionId);
    if (sessionInfo) {
      sessionInfo.lastActivity = Date.now();
    }
  }

  /**
   * Sends an error response with the specified status code and message
   */
  private sendErrorResponse(
    res: ServerResponse,
    status: number,
    message: string
  ): void {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(createErrorResponse(message)));
  }

  /**
   * Starts the session cleanup process
   */
  private startSessionCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.config.sessionCleanupInterval);
  }

  /**
   * Removes expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredIds: string[] = [];

    // Find expired sessions
    for (const [sessionId, info] of this.sessions.entries()) {
      if (now - info.lastActivity > this.config.sessionTimeout) {
        expiredIds.push(sessionId);
      }
    }

    // Remove expired sessions
    if (expiredIds.length > 0) {
      console.log(`Cleaning up ${expiredIds.length} expired sessions`);

      for (const sessionId of expiredIds) {
        try {
          const info = this.sessions.get(sessionId);
          if (info) {
            info.transport.close();
          }
          this.sessions.delete(sessionId);
        } catch (error) {
          console.error(`Error closing expired session ${sessionId}:`, error);
        }
      }
    }
  }
}

/**
 * Initialize the MCP server with HTTP transport using Vite
 */
const initServerHTTPTransport = async () => {
  const config = DEFAULT_CONFIG;

  const serverInstance = new McpServer({
    name: config.serverName,
    version: config.serverVersion,
  });

  // Register all tools
  registerIndexTools(serverInstance);
  registerDocumentTools(serverInstance);
  registerSearchTools(serverInstance);
  registerSettingsTools(serverInstance);
  registerVectorTools(serverInstance);
  registerSystemTools(serverInstance);
  registerTaskTools(serverInstance);

  const server = new MCPServer(serverInstance, config);

  // Create Vite dev server
  const vite = await createViteServer({
    server: {
      port: config.httpPort,
      middlewareMode: true,
    },
  });

  // Add CORS middleware
  vite.middlewares.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      `Origin, X-Requested-With, Content-Type, Accept, ${server["SESSION_ID_HEADER_NAME"]}`
    );

    if (req.method === "OPTIONS") {
      res.statusCode = 200;
      res.end();
      return;
    }

    next();
  });

  // Handle MCP requests
  vite.middlewares.use(async (req, res, next) => {
    const url = req.url || "/";

    if (url.startsWith(config.mcpEndpoint)) {
      if (req.method === "GET") {
        await server.handleGetRequest(req, res);
      } else if (req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          try {
            const jsonBody = JSON.parse(body);
            await server.handlePostRequest(req, res, jsonBody);
          } catch (error) {
            console.error("Error parsing request body:", error);
            res.statusCode = 400;
            res.end(JSON.stringify(createErrorResponse("Invalid JSON body")));
          }
        });
      } else {
        next();
      }
    } else {
      next();
    }
  });

  // Start listening

  console.log(
    "Meilisearch MCP Server is running on Vite HTTP transport:",
    `http://localhost:${config.httpPort}${config.mcpEndpoint}`
  );

  // Handle server shutdown
  process.on("SIGINT", async () => {
    console.log("Received SIGINT signal");
    server.shutdown();
    await vite.close();
    console.log("Vite server closed");
    process.exit(0);
  });

  return vite;
};

/**
 * Initialize the MCP server with stdio transport
 */
const initServerStdioTransport = async () => {
  const config = DEFAULT_CONFIG;

  const server = new McpServer({
    name: config.serverName,
    version: config.serverVersion,
  });

  // Register all tools
  registerIndexTools(server);
  registerDocumentTools(server);
  registerSearchTools(server);
  registerSettingsTools(server);
  registerVectorTools(server);
  registerSystemTools(server);
  registerTaskTools(server);

  // Connect stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.log("Meilisearch MCP Server is running on stdio transport");

  // Handle process termination
  process.on("SIGINT", () => {
    console.log("Shutting down stdio server...");
    process.exit(0);
  });
};

/**
 * Initialize the MCP server with the specified transport
 * @param transport The transport type to use ("stdio" or "http")
 * @throws Error if the transport type is unsupported
 */
export const initServer = (transport: "stdio" | "http"): void => {
  switch (transport) {
    case "stdio":
      initServerStdioTransport().catch((error) => {
        console.error("Fatal error initializing stdio transport:", error);
        process.exit(1);
      });
      break;
    case "http":
      initServerHTTPTransport().catch((error) => {
        console.error(
          "Fatal error initializing HTTP transport with Vite:",
          error
        );
        process.exit(1);
      });
      break;
    default:
      throw new Error(`Unsupported transport type: ${transport}`);
  }
};
