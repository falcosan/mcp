import { randomUUID } from "node:crypto";
import { IncomingMessage, ServerResponse } from "http";
import {
  Notification,
  JSONRPCNotification,
  InitializeRequestSchema,
  ToolListChangedNotification,
} from "@modelcontextprotocol/sdk/types.js";
import registerAITools from "./tools/ai-tools.js";
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
  host: string;
  apiKey: string;
  httpPort: number;
  mcpEndpoint: string;
  sessionTimeout: number;
  sessionCleanupInterval: number;
}

/**
 * Return type for the initServer function
 */
interface ServerInstance {
  mcpServer: MCPServer;
}

const defaultConfig: ServerConfig = {
  httpPort: 4995,
  mcpEndpoint: "/mcp",
  sessionTimeout: 3600000,
  sessionCleanupInterval: 60000,
  apiKey: process.env.MEILISEARCH_API_KEY || "",
  host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
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
export class MCPServer {
  private readonly JSON_RPC = "2.0";
  private readonly SESSION_ID_HEADER_NAME = "mcp-session-id";

  private server: McpServer;
  private config: ServerConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private sessions: Map<string, SessionInfo> = new Map();

  /**
   * Creates a new MCP server instance
   * @param server The underlying MCP server implementation
   * @param config Configuration options
   */
  constructor(server: McpServer, config: Partial<ServerConfig> = {}) {
    this.server = server;
    this.config = { ...defaultConfig, ...config };

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
    console.info("GET request received");

    const sessionId = this.extractSessionId(req);
    if (!sessionId || !this.sessions.has(sessionId)) {
      console.error(`Invalid session ID: ${sessionId}`);
      this.sendErrorResponse(res, 400, "Bad Request: invalid session ID");
      return;
    }

    console.info(`Establishing HTTP stream for session ${sessionId}`);
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
      if (sessionId && this.sessions.has(sessionId)) {
        console.info(`POST request for existing session ${sessionId}`);
        const sessionInfo = this.sessions.get(sessionId)!;
        await sessionInfo.transport.handleRequest(req, res, body);
        this.updateSessionActivity(sessionId);
        return;
      }

      if (!sessionId && this.isInitializeRequest(body)) {
        await this.handleInitializeRequest(req, res, body);
        return;
      }

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
    console.info("Shutting down MCP server...");

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    for (const [sessionId, sessionInfo] of this.sessions.entries()) {
      try {
        console.info(`Closing session ${sessionId}`);
        sessionInfo.transport.close();
      } catch (error) {
        console.error(`Error closing session ${sessionId}:`, error);
      }
    }

    this.sessions.clear();
    console.info("MCP server shutdown complete");
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
    const newSessionId = randomUUID();

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
    });

    transport.sessionId = newSessionId;

    try {
      await this.server.connect(transport);

      res.setHeader(this.SESSION_ID_HEADER_NAME, newSessionId);
      res.setHeader(
        "Access-Control-Expose-Headers",
        this.SESSION_ID_HEADER_NAME
      );

      await transport.handleRequest(req, res, body);

      this.sessions.set(newSessionId, {
        transport,
        lastActivity: Date.now(),
      });

      this.sendToolListChangedNotification(transport);

      console.info(`New session established: ${newSessionId}`);
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
      console.info(`Sent notification: ${notification.method}`);
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

    for (const [sessionId, info] of this.sessions.entries()) {
      if (now - info.lastActivity > this.config.sessionTimeout) {
        expiredIds.push(sessionId);
      }
    }

    if (expiredIds.length) {
      console.info(`Cleaning up ${expiredIds.length} expired sessions`);

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
const initServerHTTPTransport = async (
  customConfig?: Partial<ServerConfig>
) => {
  const serverInstance = new McpServer({
    version: "1.0.0",
    name: "mcp-meilisearch",
  });

  registerIndexTools(serverInstance);
  registerDocumentTools(serverInstance);
  registerSearchTools(serverInstance);
  registerSettingsTools(serverInstance);
  registerVectorTools(serverInstance);
  registerSystemTools(serverInstance);
  registerTaskTools(serverInstance);
  registerAITools(serverInstance);

  const server = new MCPServer(serverInstance, customConfig);

  return { mcpServer: server };
};

/**
 * Initialize the MCP server with stdio transport
 * @returns MCP server instance
 */
const initServerStdioTransport = async (
  customConfig?: Partial<ServerConfig>
) => {
  const serverInstance = new McpServer({
    version: "1.0.0",
    name: "mcp-meilisearch",
  });

  registerIndexTools(serverInstance);
  registerDocumentTools(serverInstance);
  registerSearchTools(serverInstance);
  registerSettingsTools(serverInstance);
  registerVectorTools(serverInstance);
  registerSystemTools(serverInstance);
  registerTaskTools(serverInstance);
  registerAITools(serverInstance);

  const server = new MCPServer(serverInstance, customConfig);

  const transport = new StdioServerTransport();
  await serverInstance.connect(transport);

  console.info("Meilisearch MCP Server is running on stdio transport");

  process.on("SIGINT", () => {
    console.info("Shutting down stdio server...");
    process.exit(0);
  });

  return { mcpServer: server };
};

/**
 * Initialize the MCP server with the specified transport
 * @param transport The transport type to use ("stdio" or "http")
 * @returns A promise that resolves to the server instances
 * @throws Error if the transport type is unsupported
 */
export const initServer = async (
  transport: "stdio" | "http",
  config?: Partial<ServerConfig>
): Promise<ServerInstance> => {
  try {
    switch (transport) {
      case "stdio":
        return await initServerStdioTransport(config);
      case "http":
        return await initServerHTTPTransport(config);
      default:
        throw new Error(`Unsupported transport type: ${transport}`);
    }
  } catch (error) {
    console.error(`Fatal error initializing ${transport} transport:`, error);
    throw error;
  }
};
