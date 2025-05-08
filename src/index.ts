import { serverInit } from "./server.js";
import express, { Request, Response, NextFunction } from "express";

console.log("Starting MCP Server...");

const app = express();
let server: ReturnType<typeof app.listen>;

app.use(express.json());
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, mcp-session-id"
  );
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

const mcpServer = serverInit();
const router = express.Router();

const MCP_ENDPOINT = "/mcp";

router.get("/health", (_, res: Response) => {
  res.status(200).json({ status: "healthy" });
});

router.post(
  MCP_ENDPOINT,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("Received POST request to /mcp");
      await mcpServer.handlePostRequest(req, res);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  MCP_ENDPOINT,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("Received GET request to /mcp");
      await mcpServer.handleGetRequest(req, res);
    } catch (error) {
      next(error);
    }
  }
);

app.use("/", router);

const PORT = process.env.PORT || 3000;

function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });

    setTimeout(() => {
      console.error(
        "Could not close connections in time, forcefully shutting down"
      );
      process.exit(1);
    }, 10000);
  }
}

function startServer() {
  try {
    server = app.listen(PORT, () => {
      console.log(`MCP Streamable HTTP Server listening on port ${PORT}`);
      console.log(`Server endpoint: http://localhost:${PORT}${MCP_ENDPOINT}`);
    });

    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use`);
      } else {
        console.error("Server error:", error);
      }
      process.exit(1);
    });

    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

startServer();
