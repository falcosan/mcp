import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  Notification,
  JSONRPCError,
  JSONRPCNotification,
  InitializeRequestSchema,
  ToolListChangedNotification,
} from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import registerDocumentTools from "./tools/document-tools.js";
import registerIndexTools from "./tools/index-tools.js";
import registerSearchTools from "./tools/search-tools.js";
import registerSettingsTools from "./tools/settings-tools.js";
import registerSystemTools from "./tools/system-tools.js";
import registerTaskTools from "./tools/task-tools.js";
import registerVectorTools from "./tools/vector-tools.js";

const JSON_RPC = "2.0";
const SESSION_ID_HEADER_NAME = "mcp-session-id";

export class MCPServer {
  server: McpServer;
  transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
  toolsRegistered: boolean = false;

  constructor(server: McpServer) {
    this.server = server;
    this.toolsRegistered = this.setupTools(this.server);
    console.log(
      `MCP Server initialized with tools registered: ${this.toolsRegistered}`
    );
  }

  async handleGetRequest(req: Request, res: Response) {
    console.log("GET request received");

    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !this.transports[sessionId]) {
      console.error(`Invalid session ID: ${sessionId}`);
      res
        .status(400)
        .json(
          this.createErrorResponse("Bad Request: invalid session ID or method.")
        );
      return;
    }

    console.log(`Establishing SSE stream for session ${sessionId}`);
    const transport = this.transports[sessionId];
    await transport.handleRequest(req, res);

    // Send a welcome notification
    this.sendNotification(transport, {
      method: "notifications/message",
      params: { level: "info", data: "SSE Connection established" },
    });

    return;
  }

  async handlePostRequest(req: Request, res: Response) {
    const sessionId = req.headers[SESSION_ID_HEADER_NAME] as string | undefined;
    console.log(`POST request received, sessionId: ${sessionId || "none"}`);

    try {
      if (sessionId && this.transports[sessionId]) {
        console.log(`Using existing transport for session ${sessionId}`);
        const transport = this.transports[sessionId];
        await transport.handleRequest(req, res, req.body);
        return;
      }

      if (!sessionId && this.isInitializeRequest(req.body)) {
        console.log("Handling initialize request");
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });

        await this.server.connect(transport);
        await transport.handleRequest(req, res, req.body);

        const newSessionId = transport.sessionId;
        if (newSessionId) {
          console.log(`Created new session: ${newSessionId}`);
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
          this.createErrorResponse("Bad Request: invalid session ID or method.")
        );
    } catch (error) {
      console.error("Error handling MCP request:", error);
      res
        .status(500)
        .json(this.createErrorResponse(`Internal server error: ${error}`));
    }
  }

  private setupTools(server: McpServer): boolean {
    try {
      console.log("Registering tools with MCP server...");

      registerSystemTools(server);
      registerIndexTools(server);
      registerSearchTools(server);
      registerSettingsTools(server);
      registerDocumentTools(server);
      registerTaskTools(server);
      registerVectorTools(server);

      console.log("All tools registered successfully");
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

  private createErrorResponse(message: string): JSONRPCError {
    return {
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: message,
      },
      id: randomUUID(),
    };
  }

  private isInitializeRequest(body: any): boolean {
    const isInitial = (data: any) => {
      const result = InitializeRequestSchema.safeParse(data);
      return result.success;
    };
    if (Array.isArray(body)) {
      return body.some((request) => isInitial(request));
    }
    return isInitial(body);
  }
}
