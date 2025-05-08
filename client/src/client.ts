import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  TextContentSchema,
  LoggingMessageNotificationSchema,
  ToolListChangedNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";

export class MCPClient {
  tools: { name: string; description: string }[] = [];

  private client: Client;
  private tries: number = 0;
  private transport: StreamableHTTPClientTransport | null = null;
  private readonly meilisearchIndexUid: string = "movies";
  private onToolsUpdatedCallback:
    | ((tools: Array<{ name: string; description: string }>) => void)
    | null = null;

  constructor(serverName: string) {
    this.client = new Client({
      name: `mcp-client-for-${serverName}`,
      version: "1.0.0",
    });
  }

  public setOnToolsUpdatedCallback(
    callback: (tools: Array<{ name: string; description: string }>) => void
  ) {
    this.onToolsUpdatedCallback = callback;
  }

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

  async listTools(): Promise<void> {
    try {
      console.log("📋 Fetching available tools...");
      const toolsResult = await this.client.listTools();

      if (!toolsResult) {
        console.error("❌ Received null or undefined tools result");
        this.tools = [];
      } else if (toolsResult.tools && Array.isArray(toolsResult.tools)) {
        this.tools = toolsResult.tools.map((tool: any) => ({
          name: tool.name,
          description: tool.description ?? "",
        }));
      } else {
        console.error("❌ Invalid tools response format:", toolsResult);
        this.tools = [];
      }

      if (this.onToolsUpdatedCallback) {
        this.onToolsUpdatedCallback([...this.tools]);
      }

      if (this.tools.length) {
        console.log(`✅ Successfully loaded ${this.tools.length} tools`);
      } else {
        console.warn(
          "⚠️ No tools were returned from the server or an error occurred."
        );
      }
    } catch (error) {
      console.error(`❌ Error fetching tools: ${error}`);
      this.tools = [];
      if (this.onToolsUpdatedCallback) {
        this.onToolsUpdatedCallback([...this.tools]);
      }
    }
  }

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

  async callTool(
    name: string,
    args?: Record<string, any>
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      console.log(`\n🔧 Calling tool: ${name}`);
      console.log("With arguments:", JSON.stringify(args, null, 2));

      const result = await this.client.callTool({ name, arguments: args });

      if (!result) {
        return {
          success: false,
          error: "Received null or undefined result from tool",
        };
      }

      const content = result.content as object[];
      if (!content?.length) {
        return { success: true, data: [] };
      }

      const processedContent = content.reduce((acc: any, item: any) => {
        const parse = TextContentSchema.safeParse(item);
        if (parse.success) {
          try {
            return JSON.parse(parse.data.text);
          } catch (e) {
            return parse.data.text;
          }
        }
        return item;
      }, {});

      return { success: true, data: processedContent };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  private setUpTransport(): void {
    if (this.transport === null) return;
    this.transport.onclose = () => {
      console.log("🔌 Transport closed");
    };
    this.transport.onerror = async (error) => {
      console.log("❌ Transport error:", error);
      await this.cleanup();
    };
  }

  async cleanup(): Promise<void> {
    console.log("Cleaning up resources...");
    try {
      await this.client.close();
      console.log("✅ Client closed successfully");
    } catch (error) {
      console.error("❌ Error during cleanup:", error);
    }
  }

  async close(): Promise<void> {
    await this.cleanup();
  }
}
