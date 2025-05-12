import { randomUUID } from "node:crypto";
import type { ServerOptions } from "../types/options.js";
import { configHandler } from "../utils/config-handler.js";
import { ServerResponse, IncomingMessage } from "node:http";
import { createErrorResponse } from "../utils/error-handler.js";
import { initServer, MCPServer, ServerConfig } from "../server.js";
import { AzureFunction, Context, HttpRequest } from "@azure/functions";

class SessionCache {
  private sessions = new Map<
    string,
    { transport: any | null; lastActivity: number }
  >();
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  constructor(private timeoutMs: number) {
    this.startCleanup();
  }

  get(id: string): { transport: any | null; lastActivity: number } | undefined {
    const session = this.sessions.get(id);
    if (session) {
      session.lastActivity = Date.now();
    }
    return session;
  }

  has(id: string): boolean {
    return this.sessions.has(id);
  }

  set(id: string, transport: any | null): void {
    this.sessions.set(id, { transport, lastActivity: Date.now() });
  }

  delete(id: string): boolean {
    return this.sessions.delete(id);
  }

  clear(): void {
    this.sessions.clear();
  }

  private startCleanup(): void {
    if (this.cleanupIntervalId) return;

    this.cleanupIntervalId = setInterval(() => {
      const now = Date.now();
      for (const [id, info] of this.sessions.entries()) {
        if (now - info.lastActivity > this.timeoutMs) {
          try {
            if (
              info.transport &&
              typeof (info.transport as any).close === "function"
            ) {
              (info.transport as any).close();
            }
            this.sessions.delete(id);
          } catch (error: any) {
            console.error(
              `Error cleaning up session ${id}: ${
                error.message || String(error)
              }`
            );
          }
        }
      }
    }, 60000);
  }

  stopCleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }
}

class AzureIntegrationHandler {
  private azureSessions: SessionCache;
  private mcpServerInstance: MCPServer | null = null;
  private readonly baseHeaders: Record<string, string>;
  private readonly SESSION_ID_HEADER_NAME = "mcp-session-id";
  private initializationPromise: Promise<boolean> | null = null;

  constructor() {
    this.azureSessions = new SessionCache(3600000);
    this.baseHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": `Origin, X-Requested-With, Content-Type, Accept, ${this.SESSION_ID_HEADER_NAME}`,
    };
    this.registerProcessShutdownHook();
  }

  private adaptRequest(req: HttpRequest): IncomingMessage {
    const adaptedReq = Object.create(IncomingMessage.prototype);
    adaptedReq.headers = req.headers;
    adaptedReq.method = req.method as string | undefined;
    adaptedReq.url = req.url;
    adaptedReq.body = req.body;
    return adaptedReq as IncomingMessage;
  }

  private createResponseAdapter(context: Context, extraHeaders = {}) {
    const headerMap = new Map<string, string>();
    let statusCode = 200;
    const bodyChunks: string[] = [];
    const baseHeaders = this.baseHeaders;

    const res = {
      setHeader(name: string, value: string) {
        headerMap.set(name, value);
        return this;
      },
      writeHead(
        statusCode_: number,
        headers?: Record<string, string> | string[]
      ) {
        statusCode = statusCode_;
        if (headers && !Array.isArray(headers)) {
          Object.entries(headers).forEach(([k, v]) => headerMap.set(k, v));
        }
        return this;
      },
      write(chunk: string) {
        if (chunk) bodyChunks.push(chunk);
        return this;
      },
      end(data?: string) {
        if (data) bodyChunks.push(data);

        const responseHeaders: Record<string, string> = {};
        headerMap.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        context.res = {
          status: statusCode,
          headers: {
            ...responseHeaders,
            ...baseHeaders,
            ...extraHeaders,
          },
          body: bodyChunks.join(""),
        };
        return this;
      },
    };
    return res;
  }

  private sendError(context: Context, status: number, message: string) {
    context.res = {
      status,
      headers: { "Content-Type": "application/json", ...this.baseHeaders },
      body: JSON.stringify(createErrorResponse(message)),
    };
  }

  private async ensureCoreServerInitialized(
    context: Context
  ): Promise<boolean> {
    if (this.mcpServerInstance) {
      return true;
    }

    if (!this.initializationPromise) {
      this.initializationPromise = this.initializeServer(context);
    }

    return this.initializationPromise;
  }

  private async initializeServer(context: Context): Promise<boolean> {
    try {
      const meilisearchApiKey = process.env.MEILISEARCH_API_KEY || "";
      const meilisearchHost =
        process.env.MEILISEARCH_HOST || "http://localhost:7700";

      const serverOptions: ServerOptions = {
        httpPort: 0,
        meilisearchHost,
        transport: "http",
        meilisearchApiKey,
        mcpEndpoint: "/api/mcp",
      };

      configHandler.setMeilisearchHost(meilisearchHost);
      configHandler.setMeilisearchApiKey(meilisearchApiKey);

      const coreServerConfig: Partial<ServerConfig> = {
        httpPort: serverOptions.httpPort,
        mcpEndpoint: serverOptions.mcpEndpoint,
      };

      const serverInitResult = await initServer("http", coreServerConfig);
      if (serverInitResult.mcpServer) {
        this.mcpServerInstance = serverInitResult.mcpServer;
        context.log("MCP Core server initialized successfully");
        return true;
      } else {
        throw new Error(
          "MCP Core server instance was not created by initServer."
        );
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      context.log.error(
        `Failed to initialize MCP Core server: ${errorMessage}`
      );
      this.sendError(
        context,
        503,
        `Failed to initialize MCP Core server: ${errorMessage}`
      );
      return false;
    }
  }

  public async handleAzureRequest(
    context: Context,
    req: HttpRequest
  ): Promise<void> {
    if (req.method === "OPTIONS") {
      context.res = { status: 200, headers: this.baseHeaders, body: "" };
      return;
    }

    if (!(await this.ensureCoreServerInitialized(context))) {
      return;
    }

    const currentCoreServer = this.mcpServerInstance!;
    const sessionId = req.headers[this.SESSION_ID_HEADER_NAME.toLowerCase()];

    try {
      if (req.method === "GET") {
        if (!sessionId || !this.azureSessions.has(sessionId)) {
          this.sendError(context, 400, "Bad Request: invalid session ID");
          return;
        }

        try {
          const resAdapter = this.createResponseAdapter(context);
          await currentCoreServer.handleGetRequest(
            this.adaptRequest(req),
            resAdapter as unknown as ServerResponse
          );
          if (!context.res) resAdapter.end();
        } catch (error: any) {
          const errorMessage = error.message || String(error);
          context.log.error(`Error handling GET request: ${errorMessage}`);
          this.sendError(context, 500, `Error in GET request: ${errorMessage}`);
        }
        return;
      }

      if (req.method === "POST") {
        if (sessionId && this.azureSessions.has(sessionId)) {
          try {
            const resAdapter = this.createResponseAdapter(context);
            await currentCoreServer.handlePostRequest(
              this.adaptRequest(req),
              resAdapter as unknown as ServerResponse,
              req.body
            );
            if (!context.res) resAdapter.end();
          } catch (error: any) {
            const errorMessage = error.message || String(error);
            context.log.error(`Error handling POST request: ${errorMessage}`);
            this.sendError(
              context,
              500,
              `Error in POST request: ${errorMessage}`
            );
          }
          return;
        }

        if (currentCoreServer.isInitializeRequest?.(req.body)) {
          const newSessionId = randomUUID();
          this.azureSessions.set(newSessionId, null);

          try {
            const resAdapter = this.createResponseAdapter(context, {
              [this.SESSION_ID_HEADER_NAME]: newSessionId,
              "Access-Control-Expose-Headers": this.SESSION_ID_HEADER_NAME,
            });
            await currentCoreServer.handlePostRequest(
              this.adaptRequest(req),
              resAdapter as unknown as ServerResponse,
              req.body
            );
            if (!context.res) resAdapter.end();
            context.log(`New session created: ${newSessionId}`);
          } catch (error: any) {
            const errorMessage = error.message || String(error);
            context.log.error(`Error initializing session: ${errorMessage}`);
            this.azureSessions.delete(newSessionId);
            this.sendError(
              context,
              500,
              `Error initializing session: ${errorMessage}`
            );
          }
          return;
        }

        this.sendError(
          context,
          400,
          "Invalid request: missing session ID or not an initialize request"
        );
        return;
      }

      this.sendError(context, 405, "Method not allowed");
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      context.log.error(`Error handling MCP request: ${errorMessage}`);
      this.sendError(context, 500, `Internal server error: ${errorMessage}`);
    }
  }

  private registerProcessShutdownHook(): void {
    if (
      typeof process !== "undefined" &&
      process.env.FUNCTIONS_WORKER_RUNTIME &&
      !(process as any).azureMcpSigtermHandlerRegistered
    ) {
      const sigtermHandler = () => {
        this.dispose();
      };
      process.on("SIGTERM", sigtermHandler);
      (process as any).azureMcpSigtermHandlerRegistered = true;
    }
  }

  public dispose(): void {
    this.azureSessions.stopCleanup();

    if (
      this.mcpServerInstance &&
      typeof this.mcpServerInstance.shutdown === "function"
    ) {
      try {
        this.mcpServerInstance.shutdown();
      } catch (error: any) {
        const errorMessage = error.message || String(error);
        console.error(
          `Error shutting down MCP Core server on dispose: ${errorMessage}`
        );
      }
    }

    this.azureSessions.clear();
    this.mcpServerInstance = null;
    this.initializationPromise = null;

    if (
      typeof process !== "undefined" &&
      (process as any).azureMcpSigtermHandlerRegistered
    ) {
      (process as any).azureMcpSigtermHandlerRegistered = false;
    }
  }
}

const azureIntegrationHandlerInstance = new AzureIntegrationHandler();

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  await azureIntegrationHandlerInstance.handleAzureRequest(context, req);
};

export default httpTrigger;
