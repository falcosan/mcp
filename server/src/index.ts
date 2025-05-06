import { MCPServer } from "./server.js";
import express, { Request, Response, NextFunction } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

console.log("Starting MCP Server...");

const mcpServer = new McpServer({
  name: "mcp-server",
  version: "1.0.0",
});

const server = new MCPServer(mcpServer);

const app = express();
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

const router = express.Router();

const MCP_ENDPOINT = "/mcp";

router.post(MCP_ENDPOINT, async (req: Request, res: Response) => {
  console.log("Received POST request to /mcp");
  await server.handlePostRequest(req, res);
});

router.get(MCP_ENDPOINT, async (req: Request, res: Response) => {
  console.log("Received GET request to /mcp");
  await server.handleGetRequest(req, res);
});

app.use("/", router);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`MCP Streamable HTTP Server listening on port ${PORT}`);
  console.log(`Server endpoint: http://localhost:${PORT}${MCP_ENDPOINT}`);
});

process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  process.exit(0);
});
