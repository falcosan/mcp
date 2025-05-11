import { randomUUID } from "node:crypto";
import { initServer } from "./server.js";
import { configHandler } from "./utils/config-handler.js";
import type { ServerOptions } from "./types/options.js";
import { createErrorResponse } from "./utils/error-handler.js";
import { AzureFunction, Context, HttpRequest } from "@azure/functions";

let mcpServerInstance: any = null;
const sessions = new Map<
  string,
  {
    transport: any;
    lastActivity: number;
  }
>();

const SESSION_ID_HEADER_NAME = "mcp-session-id";
const SESSION_TIMEOUT = Number(process.env.SESSION_TIMEOUT) || 3600000;

/**
 * Azure Function handler for MCP server requests
 */
const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  if (!mcpServerInstance) {
    try {
      const options: ServerOptions = {
        httpPort: 0,
        transport: "http",
        mcpEndpoint: "/mcp",
        meilisearchApiKey: process.env.MEILISEARCH_API_KEY || "",
        meilisearchHost:
          process.env.MEILISEARCH_HOST || "http://localhost:7700",
      };

      configHandler.setMeilisearchHost(options.meilisearchHost);
      configHandler.setMeilisearchApiKey(options.meilisearchApiKey);

      const serverInstances = await initServer("http", options);
      mcpServerInstance = serverInstances.mcpServer;
      context.log("MCP server initialized successfully");
    } catch (error) {
      context.log.error("Failed to initialize MCP server:", error);
      context.res = {
        status: 503,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          createErrorResponse("Failed to initialize MCP server")
        ),
      };
      return;
    }
  }

  const headers = {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGINS || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Origin, X-Requested-With, Content-Type, Accept, mcp-session-id",
  };

  if (req.method === "OPTIONS") {
    context.res = {
      status: 200,
      headers,
      body: "",
    };
    return;
  }

  const sessionId = req.headers[SESSION_ID_HEADER_NAME.toLowerCase()];

  try {
    if (req.method === "GET") {
      if (!sessionId || !sessions.has(sessionId)) {
        context.res = {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify(
            createErrorResponse("Bad Request: invalid session ID")
          ),
        };
        return;
      }

      const sessionInfo = sessions.get(sessionId);
      if (!sessionInfo) {
        throw new Error("Session info not found");
      }

      sessionInfo.lastActivity = Date.now();

      const res = {
        headers: new Map(),
        statusCode: 200,
        setHeader: (name: string, value: string) => {
          res.headers.set(name, value);
        },
        writeHead: (
          statusCode: number,
          headers?: Record<string, string> | string[]
        ) => {
          res.statusCode = statusCode;
          if (headers && !Array.isArray(headers)) {
            Object.entries(headers).forEach(([key, value]) => {
              res.headers.set(key, value);
            });
          }
        },
        write: (chunk: string) => {
          // In Azure Functions, we collect everything in end()
          // This is a no-op as we'll handle all the response in end()
        },
        end: (data: string) => {
          const responseHeaders: Record<string, string> = {};
          res.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });

          context.res = {
            status: res.statusCode,
            headers: {
              ...responseHeaders,
              ...headers,
            },
            body: data,
          };
        },
      };

      try {
        await mcpServerInstance.handleGetRequest(
          { ...req, headers: req.headers },
          res
        );

        // If we haven't stored the transport yet, try to get it from mcpServerInstance
        if (
          !sessionInfo.transport &&
          mcpServerInstance.sessions?.has?.(sessionId)
        ) {
          const mcpSession = mcpServerInstance.sessions.get(sessionId);
          if (mcpSession?.transport) {
            sessionInfo.transport = mcpSession.transport;
          }
        }
      } catch (error) {
        context.log.error(
          `Error handling GET request for session ${sessionId}:`,
          error
        );
        context.res = {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify(
            createErrorResponse(`Error in GET request: ${error}`)
          ),
        };
      }
      return;
    }

    if (req.method === "POST") {
      if (sessionId && sessions.has(sessionId)) {
        const sessionInfo = sessions.get(sessionId);
        if (!sessionInfo) {
          throw new Error("Session info not found");
        }

        sessionInfo.lastActivity = Date.now();

        const res = {
          headers: new Map(),
          statusCode: 200,
          setHeader: (name: string, value: string) => {
            res.headers.set(name, value);
          },
          writeHead: (
            statusCode: number,
            headers?: Record<string, string> | string[]
          ) => {
            res.statusCode = statusCode;
            if (headers && !Array.isArray(headers)) {
              Object.entries(headers).forEach(([key, value]) => {
                res.headers.set(key, value);
              });
            }
          },
          write: (chunk: string) => {
            // In Azure Functions, we collect everything in end()
            // This is a no-op as we'll handle all the response in end()
          },
          end: (data: string) => {
            const responseHeaders: Record<string, string> = {};
            res.headers.forEach((value, key) => {
              responseHeaders[key] = value;
            });

            context.res = {
              status: res.statusCode,
              headers: {
                ...responseHeaders,
                ...headers,
              },
              body: data,
            };
          },
        };

        await mcpServerInstance.handlePostRequest(
          { ...req, headers: req.headers },
          res,
          req.body
        );
        return;
      }

      if (mcpServerInstance.isInitializeRequest?.(req.body)) {
        const newSessionId = randomUUID();

        const res = {
          headers: new Map(),
          statusCode: 200,
          setHeader: (name: string, value: string) => {
            res.headers.set(name, value);
          },
          writeHead: (
            statusCode: number,
            headers?: Record<string, string> | string[]
          ) => {
            res.statusCode = statusCode;
            if (headers && !Array.isArray(headers)) {
              Object.entries(headers).forEach(([key, value]) => {
                res.headers.set(key, value);
              });
            }
          },
          write: (chunk: string) => {
            // In Azure Functions, we collect everything in end()
            // This is a no-op as we'll handle all the response in end()
          },
          end: (data: string) => {
            const responseHeaders: Record<string, string> = {};
            res.headers.forEach((value, key) => {
              responseHeaders[key] = value;
            });

            context.res = {
              status: res.statusCode,
              headers: {
                ...responseHeaders,
                [SESSION_ID_HEADER_NAME]: newSessionId,
                "Access-Control-Expose-Headers": SESSION_ID_HEADER_NAME,
                ...headers,
              },
              body: data,
            };
          },
        };

        try {
          await mcpServerInstance.handleInitializeRequest(
            { ...req, headers: req.headers },
            res,
            req.body
          );

          // Store the new session
          sessions.set(newSessionId, {
            transport: null, // We'll update this on the first GET request
            lastActivity: Date.now(),
          });

          context.log(`New session created: ${newSessionId}`);
          return;
        } catch (error) {
          context.log.error("Error handling initialize request:", error);
          context.res = {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
            body: JSON.stringify(
              createErrorResponse(`Error initializing session: ${error}`)
            ),
          };
          return;
        }
      }

      context.res = {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(
          createErrorResponse(
            "Invalid request: missing session ID or not an initialize request"
          )
        ),
      };
      return;
    }

    context.res = {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(createErrorResponse("Method not allowed")),
    };
  } catch (error) {
    context.log.error("Error handling MCP request:", error);
    context.res = {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(
        createErrorResponse(`Internal server error: ${error}`)
      ),
    };
  }
};

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  const expiredIds: string[] = [];

  for (const [sessionId, info] of sessions.entries()) {
    if (now - info.lastActivity > SESSION_TIMEOUT) {
      expiredIds.push(sessionId);
    }
  }

  for (const sessionId of expiredIds) {
    try {
      const sessionInfo = sessions.get(sessionId);
      if (sessionInfo?.transport) {
        sessionInfo.transport.close();
      }
      sessions.delete(sessionId);
    } catch (error) {
      console.error(`Error cleaning up session ${sessionId}:`, error);
    }
  }
}, 60000);

if (typeof process !== "undefined" && process.env.FUNCTIONS_WORKER_RUNTIME) {
  process.on("SIGTERM", () => {
    clearInterval(cleanupInterval);
    if (mcpServerInstance && typeof mcpServerInstance.shutdown === "function") {
      try {
        mcpServerInstance.shutdown();
      } catch (error) {
        console.error("Error shutting down MCP server:", error);
      }
    }
  });
}

export default httpTrigger;
