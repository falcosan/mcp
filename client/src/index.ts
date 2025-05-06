import { URL } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  TextContentSchema,
  LoggingMessageNotificationSchema,
  ToolListChangedNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";

class MCPClient {
  tools: { name: string; description: string }[] = [];

  private client: Client;
  private tries: number = 0;
  private isCompleted = false;
  private transport: StreamableHTTPClientTransport | null = null;

  constructor(serverName: string) {
    this.client = new Client({
      name: `mcp-client-for-${serverName}`,
      version: "1.0.0",
    });
  }

  async connectToServer(serverUrl: string) {
    const url = new URL(serverUrl);
    try {
      this.transport = new StreamableHTTPClientTransport(url);
      await this.client.connect(this.transport);
      console.log("Connected to server");

      this.setUpTransport();
      this.setUpNotifications();

      // Explicitly fetch tools after connection
      await this.listTools();
    } catch (e) {
      this.tries++;
      if (this.tries > 3) {
        // Increase retry attempts
        console.error("Failed to connect to MCP server: ", e);
        throw e;
      }
      console.info(`Retry attempt ${this.tries} to connect to server`);
      setTimeout(() => this.connectToServer(serverUrl), this.tries * 1000);
    }
  }

  async listTools() {
    try {
      console.log("Fetching available tools...");
      const toolsResult = await this.client.listTools();

      if (toolsResult.tools && Array.isArray(toolsResult.tools)) {
        this.tools = toolsResult.tools.map((tool) => {
          return {
            name: tool.name,
            description: tool.description ?? "",
          };
        });
      } else {
        console.error("Invalid tools response format:", toolsResult);
      }
    } catch (error) {
      console.error(`Error fetching tools: ${error}`);
    }
  }

  private setUpNotifications() {
    this.client.setNotificationHandler(
      LoggingMessageNotificationSchema,
      (notification) => {
        console.log("LoggingMessageNotification received:", notification);
      }
    );

    this.client.setNotificationHandler(
      ToolListChangedNotificationSchema,
      async (notification) => {
        console.log("ToolListChangedNotification received:", notification);
        await this.listTools();
      }
    );
  }

  async callTool(name: string) {
    try {
      console.log("\nCalling tool: ", name);

      // Get appropriate arguments based on tool name
      const args = this.getToolArguments(name);

      const result = await this.client.callTool({
        name: name,
        arguments: args,
      });

      const content = result.content as object[];

      console.log("results:");
      content.forEach((item) => {
        const parse = TextContentSchema.safeParse(item);
        if (parse.success) {
          console.log(`- ${parse.data.text}`);
        }
      });
    } catch (error) {
      console.error(`Error calling tool ${name}: ${error}`);
    }
  }

  private getToolArguments(toolName: string): Record<string, any> {
    // Return appropriate arguments based on the tool name
    switch (toolName) {
      case "health":
      case "version":
      case "info":
      case "enable-vector-search":
      case "get-experimental-features":
        return {}; // These tools don't require arguments

      case "list-indexes":
        return { limit: 10 };

      case "search":
        return {
          indexUid: "movies", // Replace with an actual index name
          q: "action",
        };

      case "get-settings":
      case "get-index":
      case "get-searchable-attributes":
      case "get-displayed-attributes":
      case "get-embedders":
      case "stats":
        return {
          indexUid: "movies", // Replace with an actual index name
        };

      // Add more cases as needed for other tools

      default:
        console.log(
          `No specific arguments defined for tool ${toolName}, skipping call`
        );
        throw new Error(`No arguments defined for tool ${toolName}`);
    }
  }

  // private setUpNotifications() {
  //   this.client.setNotificationHandler(
  //     LoggingMessageNotificationSchema,
  //     (notification) => {
  //       console.log(
  //         "LoggingMessageNotificationSchema received:  ",
  //         notification
  //       );
  //     }
  //   );
  //   this.client.setNotificationHandler(
  //     ToolListChangedNotificationSchema,
  //     async (notification) => {
  //       console.log(
  //         "ToolListChangedNotificationSchema received:  ",
  //         notification
  //       );
  //       await this.listTools();
  //     }
  //   );
  // }

  private setUpTransport() {
    if (this.transport === null) {
      return;
    }
    this.transport.onclose = () => {
      console.log("SSE transport closed.");
      this.isCompleted = true;
    };

    this.transport.onerror = async (error) => {
      console.log("SSE transport error: ", error);
      await this.cleanup();
    };
  }

  async waitForCompletion() {
    while (!this.isCompleted) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async cleanup() {
    await this.client.close();
  }
}

async function main() {
  const client = new MCPClient("sse-server");

  try {
    await client.connectToServer("http://localhost:3000/mcp");
    await client.listTools();

    console.log(`Found ${client.tools.length} tools`);

    // Try calling only system tools that don't require specific arguments
    const basicTools = ["health", "version", "info"];

    for (const toolName of basicTools) {
      const tool = client.tools.find((t) => t.name === toolName);
      if (tool) {
        try {
          await client.callTool(tool.name);
        } catch (error) {
          console.error(`Error calling tool ${toolName}: ${error}`);
        }
      } else {
        console.log(`Tool ${toolName} not found`);
      }
    }

    await client.waitForCompletion();
  } finally {
    await client.cleanup();
  }
}

main();
