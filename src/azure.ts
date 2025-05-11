import { IncomingMessage } from "http";
import { randomUUID } from "node:crypto";
import { initServer } from "./server.js";
import type { ServerOptions } from "./types/options.js";
import { configHandler } from "./utils/config-handler.js";
import { createErrorResponse } from "./utils/error-handler.js";
import { AzureFunction, Context, HttpRequest } from "@azure/functions";

const SESSION_ID_HEADER_NAME = "mcp-session-id";
const SESSION_TIMEOUT = Number(process.env.SESSION_TIMEOUT) || 3600000;

interface MCPServerAdapter {
  handleGetRequest(req: IncomingMessage, res: any): Promise<void>;
  handlePostRequest(req: IncomingMessage, res: any, body: any): Promise<void>;
  isInitializeRequest(body: any): boolean;
  shutdown(): void;
}

let mcpServer: MCPServerAdapter | null = null;
const sessions = new Map<string, { transport: any; lastActivity: number }>();

const baseHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGINS || "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": `Origin, X-Requested-With, Content-Type, Accept, ${SESSION_ID_HEADER_NAME}`,
};

function adaptRequest(req: HttpRequest): IncomingMessage {
  const adaptedReq = Object.create(
    IncomingMessage.prototype
  ) as IncomingMessage;
  adaptedReq.headers = req.headers as any;
  adaptedReq.method = req.method as string | undefined;
  adaptedReq.url = req.url;

  (adaptedReq as any).body = req.body;

  return adaptedReq;
}

function createResponseAdapter(context: Context, extraHeaders = {}) {
  const res = {
    headers: new Map(),
    statusCode: 200,
    bodyChunks: [] as string[],

    setHeader(name: string, value: string) {
      this.headers.set(name, value);
      return this;
    },

    writeHead(statusCode: number, headers?: Record<string, string> | string[]) {
      this.statusCode = statusCode;
      if (headers && !Array.isArray(headers)) {
        Object.entries(headers).forEach(([k, v]) => this.headers.set(k, v));
      }
      return this;
    },

    write(chunk: string) {
      if (chunk) this.bodyChunks.push(chunk);
      return this;
    },

    end(data?: string) {
      if (data) this.bodyChunks.push(data);

      const responseHeaders: Record<string, string> = {};
      this.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      context.res = {
        status: this.statusCode,
        headers: { ...responseHeaders, ...baseHeaders, ...extraHeaders },
        body: this.bodyChunks.join(""),
      };
      return this;
    },
  };

  return res;
}

function sendError(context: Context, status: number, message: string) {
  context.res = {
    status,
    headers: { "Content-Type": "application/json", ...baseHeaders },
    body: JSON.stringify(createErrorResponse(message)),
  };
}

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  if (!mcpServer) {
    try {
      const options: ServerOptions = {
        httpPort: 0,
        transport: "http",
        mcpEndpoint: "/api/mcp",
        meilisearchApiKey: process.env.MEILISEARCH_API_KEY || "",
        meilisearchHost:
          process.env.MEILISEARCH_HOST || "http://localhost:7700",
      };

      configHandler.setMeilisearchHost(options.meilisearchHost);
      configHandler.setMeilisearchApiKey(options.meilisearchApiKey);

      const server = await initServer("http", options);
      if (server.mcpServer) {
        mcpServer = server.mcpServer;
        context.log("MCP server initialized successfully");
      } else {
        throw new Error("Failed to initialize MCP server");
      }
    } catch (error) {
      sendError(context, 503, "Failed to initialize MCP server");
      return;
    }
  }

  if (req.method === "OPTIONS") {
    context.res = { status: 200, headers: baseHeaders, body: "" };
    return;
  }

  const sessionId = req.headers[SESSION_ID_HEADER_NAME.toLowerCase()];

  try {
    if (req.method === "GET") {
      if (!sessionId || !sessions.has(sessionId)) {
        sendError(context, 400, "Bad Request: invalid session ID");
        return;
      }

      const session = sessions.get(sessionId)!;
      session.lastActivity = Date.now();

      try {
        const res = createResponseAdapter(context);
        await mcpServer.handleGetRequest(adaptRequest(req), res);
        if (!context.res) res.end();
      } catch (error) {
        context.log.error(`Error handling GET request: ${error}`);
        sendError(context, 500, `Error in GET request: ${error}`);
      }
      return;
    }

    if (req.method === "POST") {
      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId)!;
        session.lastActivity = Date.now();

        try {
          const res = createResponseAdapter(context);
          await mcpServer.handlePostRequest(adaptRequest(req), res, req.body);
          if (!context.res) res.end();
        } catch (error) {
          context.log.error(`Error handling POST request: ${error}`);
          sendError(context, 500, `Error in POST request: ${error}`);
        }
        return;
      }

      if (mcpServer.isInitializeRequest?.(req.body)) {
        const newSessionId = randomUUID();
        sessions.set(newSessionId, {
          transport: null,
          lastActivity: Date.now(),
        });

        try {
          const res = createResponseAdapter(context, {
            [SESSION_ID_HEADER_NAME]: newSessionId,
            "Access-Control-Expose-Headers": SESSION_ID_HEADER_NAME,
          });

          await mcpServer.handlePostRequest(adaptRequest(req), res, req.body);
          if (!context.res) res.end();
          context.log(`New session created: ${newSessionId}`);
        } catch (error) {
          context.log.error(`Error initializing session: ${error}`);
          sessions.delete(newSessionId);
          sendError(context, 500, `Error initializing session: ${error}`);
        }
        return;
      }

      sendError(
        context,
        400,
        "Invalid request: missing session ID or not an initialize request"
      );
      return;
    }

    sendError(context, 405, "Method not allowed");
  } catch (error) {
    context.log.error(`Error handling MCP request: ${error}`);
    sendError(context, 500, `Internal server error: ${error}`);
  }
};

const cleanupInterval = setInterval(() => {
  const now = Date.now();

  for (const [id, info] of sessions.entries()) {
    if (now - info.lastActivity > SESSION_TIMEOUT) {
      try {
        if (info.transport) info.transport.close();
        sessions.delete(id);
      } catch (error) {
        console.error(`Error cleaning up session ${id}:`, error);
      }
    }
  }
}, 60000);

if (typeof process !== "undefined" && process.env.FUNCTIONS_WORKER_RUNTIME) {
  process.on("SIGTERM", () => {
    clearInterval(cleanupInterval);
    if (mcpServer && typeof mcpServer.shutdown === "function") {
      try {
        mcpServer.shutdown();
      } catch (error) {
        console.error(`Error shutting down MCP server: ${error}`);
      }
    }
  });
}

export default httpTrigger;
