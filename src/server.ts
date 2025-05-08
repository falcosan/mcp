import { randomUUID } from "node:crypto";
import {
  Notification,
  JSONRPCNotification,
  InitializeRequestSchema,
  ToolListChangedNotification,
} from "@modelcontextprotocol/sdk/types.js";
import { Request, Response } from "express";
import registerTaskTools from "./tools/task-tools.js";
import registerIndexTools from "./tools/index-tools.js";
import registerSearchTools from "./tools/search-tools.js";
import registerSystemTools from "./tools/system-tools.js";
import registerVectorTools from "./tools/vector-tools.js";
import registerDocumentTools from "./tools/document-tools.js";
import registerSettingsTools from "./tools/settings-tools.js";
import { createErrorResponse } from "./utils/error-handler.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const JSON_RPC = "2.0";
const SESSION_ID_HEADER_NAME = "mcp-session-id";
const SERVER_SUITE = new McpServer({ name: "mcp-server", version: "1.0.0" });

class MCPServer {
  server: McpServer;
  transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
  toolsRegistered: boolean = false;

  constructor(server: McpServer) {
    this.server = server;
    this.toolsRegistered = this.setupTools(this.server);
  }

  async handleGetRequest(req: Request, res: Response) {
    console.log("GET request received");

    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !this.transports[sessionId]) {
      console.error(`Invalid session ID: ${sessionId}`);
      res
        .status(400)
        .json(
          createErrorResponse("Bad Request: invalid session ID or method.")
        );
      return;
    }

    console.log(`Establishing SSE stream for session ${sessionId}`);
    const transport = this.transports[sessionId];
    await transport.handleRequest(req, res);

    this.sendNotification(transport, {
      method: "notifications/message",
      params: { level: "info", data: "SSE Connection established" },
    });

    return;
  }

  async handlePostRequest(req: Request, res: Response) {
    const sessionId = req.headers[SESSION_ID_HEADER_NAME] as string | undefined;

    try {
      if (sessionId) {
        console.log(`POST request received, sessionId: ${sessionId}`);
        if (this.transports[sessionId]) {
          console.log(`Using existing transport for session ${sessionId}`);
          const transport = this.transports[sessionId];
          await transport.handleRequest(req, res, req.body);
          return;
        }
      }

      if (!sessionId && this.isInitializeRequest(req.body)) {
        console.log("Handling initialize request");
        const newSessionId = randomUUID();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => newSessionId,
        });

        transport.sessionId = newSessionId;

        await this.server.connect(transport);

        res.setHeader(SESSION_ID_HEADER_NAME, newSessionId);
        res.setHeader("Access-Control-Expose-Headers", SESSION_ID_HEADER_NAME);

        await transport.handleRequest(req, res, req.body);

        if (newSessionId) {
          this.transports[newSessionId] = transport;
          this.sendToolListChangedNotification(transport);
        } else {
          console.error("No session ID generated for new transport");
        }

        return;
      }

      console.error(
        "Invalid request: missing session ID or not an initialize request"
      );
      res
        .status(400)
        .json(
          createErrorResponse("Bad Request: invalid session ID or method.")
        );
    } catch (error) {
      console.error("Error handling MCP request:", error);
      res
        .status(500)
        .json(createErrorResponse(`Internal server error: ${error}`));
    }
  }

  private setupTools(server: McpServer): boolean {
    try {
      registerSystemTools(server);
      registerIndexTools(server);
      registerSearchTools(server);
      registerSettingsTools(server);
      registerDocumentTools(server);
      registerTaskTools(server);
      registerVectorTools(server);

      return true;
    } catch (error) {
      console.error("Failed to register tools:", error);
      return false;
    }
  }

  private sendToolListChangedNotification(
    transport: StreamableHTTPServerTransport
  ) {
    const notification: ToolListChangedNotification = {
      method: "notifications/tools/list_changed",
      params: {},
    };

    this.sendNotification(transport, notification);
  }

  private async sendNotification(
    transport: StreamableHTTPServerTransport,
    notification: Notification
  ) {
    try {
      const rpcNotification: JSONRPCNotification = {
        ...notification,
        jsonrpc: JSON_RPC,
      };
      await transport.send(rpcNotification);
      console.log(`Sent notification: ${notification.method}`);
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  }

  private isInitializeRequest(body: any): boolean {
    const isInitial = (data: any) => {
      const result = InitializeRequestSchema.safeParse(data);
      return result.success;
    };
    if (Array.isArray(body)) return body.some(isInitial);

    return isInitial(body);
  }
}

export const serverInit = () => new MCPServer(SERVER_SUITE);
