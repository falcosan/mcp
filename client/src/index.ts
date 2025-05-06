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
  private meilisearchIndexUid: string = "movies";

  constructor(serverName: string) {
    this.client = new Client({
      name: `mcp-client-for-${serverName}`,
      version: "1.0.0",
    });
  }

  /**
   * Connect to the MCP server
   * @param serverUrl Server URL to connect to
   */
  async connectToServer(serverUrl: string): Promise<void> {
    const url = new URL(serverUrl);
    try {
      console.log(`Connecting to MCP server at ${serverUrl}...`);
      this.transport = new StreamableHTTPClientTransport(url);
      await this.client.connect(this.transport);
      console.log("✅ Successfully connected to server");

      this.setUpTransport();
      this.setUpNotifications();

      await this.listTools();
    } catch (e) {
      this.tries++;
      if (this.tries > 5) {
        console.error("❌ Failed to connect to MCP server: ", e);
        throw e;
      }
      console.info(`⚠️ Retry attempt ${this.tries} to connect to server`);
      await new Promise((resolve) => setTimeout(resolve, this.tries * 1000));
      await this.connectToServer(serverUrl);
    }
  }

  /**
   * Fetch available tools from the server
   */
  async listTools(): Promise<void> {
    try {
      console.log("📋 Fetching available tools...");
      const toolsResult = await this.client.listTools();

      if (!toolsResult) {
        console.error("❌ Received null or undefined tools result");
        return;
      }

      if (toolsResult.tools && Array.isArray(toolsResult.tools)) {
        this.tools = toolsResult.tools.map((tool: any) => {
          return {
            name: tool.name,
            description: tool.description ?? "",
          };
        });

        console.log(`✅ Successfully loaded ${this.tools.length} tools`);

        // If tools were loaded, let's print them out
        if (this.tools.length > 0) {
          console.log("Available tools:");
          this.tools.forEach((tool, index) => {
            console.log(`${index + 1}. ${tool.name}: ${tool.description}`);
          });
        } else {
          console.warn("⚠️ No tools were returned from the server");
        }
      } else {
        console.error("❌ Invalid tools response format:", toolsResult);
      }
    } catch (error) {
      console.error(`❌ Error fetching tools: ${error}`);
    }
  }

  /**
   * Set up notification handlers
   */
  private setUpNotifications(): void {
    console.log("Setting up notification handlers...");

    this.client.setNotificationHandler(
      LoggingMessageNotificationSchema,
      (notification) => {
        console.log("📢 LoggingMessage received:", notification);
      }
    );

    this.client.setNotificationHandler(
      ToolListChangedNotificationSchema,
      async (notification) => {
        console.log("🔄 ToolListChanged notification received:", notification);
        await this.listTools();
      }
    );

    console.log("✅ Notification handlers set up");
  }

  /**
   * Call a tool by name
   * @param name Name of the tool to call
   */
  async callTool(name: string): Promise<void> {
    try {
      console.log(`\n🔧 Calling tool: ${name}`);

      // Get appropriate arguments based on tool name
      const args = this.getToolArguments(name);
      console.log("With arguments:", JSON.stringify(args, null, 2));

      const result = await this.client.callTool({
        name: name,
        arguments: args,
      });

      if (!result) {
        console.error("❌ Received null or undefined result from tool");
        return;
      }

      const content = result.content as object[];

      console.log("📊 Results:");
      if (!content || content.length === 0) {
        console.log("No content returned");
        return;
      }

      content.forEach((item) => {
        const parse = TextContentSchema.safeParse(item);
        if (parse.success) {
          console.log(`- ${parse.data.text}`);
        } else {
          console.log(`- Unknown content type: ${JSON.stringify(item)}`);
        }
      });
    } catch (error) {
      console.error(`❌ Error calling tool ${name}:`, error);
    }
  }

  /**
   * Get arguments for a specific tool
   * @param toolName Name of the tool
   * @returns Object containing the appropriate arguments
   */
  private getToolArguments(toolName: string): Record<string, any> {
    switch (toolName) {
      case "health":
      case "version":
      case "info":
      case "enable-vector-search":
      case "get-experimental-features":
        return {};

      // Index tools
      case "list-indexes":
        return { limit: 20 };

      case "create-index":
        return {
          indexUid: "test-index",
          primaryKey: "id",
        };

      case "get-index":
        return {
          indexUid: this.meilisearchIndexUid,
        };

      case "delete-index":
        return {
          indexUid: "test-index",
        };

      // Search tools
      case "search":
        return {
          indexUid: this.meilisearchIndexUid,
          q: "action",
        };

      // Document tools
      case "get-documents":
        return {
          indexUid: this.meilisearchIndexUid,
          limit: 5,
        };

      case "add-documents":
        return {
          indexUid: this.meilisearchIndexUid,
          documents: JSON.stringify([
            { id: "1", title: "Test Document 1" },
            { id: "2", title: "Test Document 2" },
          ]),
        };

      // Settings tools
      case "get-settings":
      case "get-searchable-attributes":
      case "get-displayed-attributes":
      case "get-embedders":
      case "stats":
        return {
          indexUid: this.meilisearchIndexUid,
        };

      default:
        console.log(
          `⚠️ No specific arguments defined for tool ${toolName}, using empty object`
        );
        return {};
    }
  }

  /**
   * Set up transport event handlers
   */
  private setUpTransport(): void {
    if (this.transport === null) {
      return;
    }

    this.transport.onclose = () => {
      console.log("🔌 Transport closed");
      this.isCompleted = true;
    };

    this.transport.onerror = async (error) => {
      console.log("❌ Transport error:", error);
      await this.cleanup();
    };
  }

  /**
   * Set the Meilisearch index UID to use
   * @param indexUid Index UID
   */
  setIndexUid(indexUid: string): void {
    this.meilisearchIndexUid = indexUid;
  }

  /**
   * Wait for completion (transport close)
   */
  async waitForCompletion(): Promise<void> {
    console.log("Waiting for completion...");
    while (!this.isCompleted) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    console.log("Cleaning up resources...");
    try {
      await this.client.close();
      console.log("✅ Client closed successfully");
    } catch (error) {
      console.error("❌ Error during cleanup:", error);
    }
  }

  /**
   * Manually close the connection
   */
  async close(): Promise<void> {
    this.isCompleted = true;
    await this.cleanup();
  }
}

async function main() {
  const client = new MCPClient("meilisearch-client");

  try {
    console.log("🚀 Starting MCP client for Meilisearch...");

    await client.connectToServer("http://localhost:3000/mcp");

    if (!client.tools.length) {
      console.error(
        "❌ No tools were found! Check if the server is running correctly."
      );
      return;
    }

    // Example: Try to list indexes
    const indexListTool = client.tools.find((t) => t.name === "list-indexes");
    if (indexListTool) {
      await client.callTool("list-indexes");
    }

    // Keep the connection open until manually closed
    console.log("\n✅ Client running. Press Ctrl+C to exit.");

    // Optional: uncomment to automatically exit after some time
    // setTimeout(() => client.close(), 10000);

    await client.waitForCompletion();
  } catch (error) {
    console.error("❌ Fatal error:", error);
  } finally {
    await client.cleanup();
  }
}

// Start the client
main().catch(console.error);
