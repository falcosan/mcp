import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  TextContentSchema,
  LoggingMessageNotificationSchema,
  ToolListChangedNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";

export class MCPClient {
  isConnected: boolean = false;
  tools: { name: string; description: string }[] = [];

  private client: Client;
  private tries: number = 0;
  private transport: StreamableHTTPClientTransport | null = null;
  private onToolsUpdatedCallback:
    | ((tools: Array<{ name: string; description: string }>) => void)
    | null = null;

  constructor(serverName: string) {
    this.client = new Client({ name: serverName, version: "1.0.0" });
  }

  public setOnToolsUpdatedCallback(
    callback: (tools: Array<{ name: string; description: string }>) => void
  ) {
    this.onToolsUpdatedCallback = callback;
  }

  async connectToServer(serverUrl: string): Promise<void> {
    const url = new URL(serverUrl);
    try {
      this.transport = new StreamableHTTPClientTransport(url);
      await this.client.connect(this.transport);

      this.setUpTransport();
      this.setUpNotifications();

      await this.listTools();
      this.isConnected = true;
    } catch (e) {
      this.tries++;
      if (this.tries > 5) {
        this.isConnected = false;
        throw e;
      }
      await new Promise((resolve) => setTimeout(resolve, this.tries * 1000));
      await this.connectToServer(serverUrl);
    }
  }

  async listTools(): Promise<void> {
    try {
      const toolsResult = await this.client.listTools();

      if (!toolsResult) {
        this.tools = [];
      } else if (toolsResult.tools && Array.isArray(toolsResult.tools)) {
        this.tools = toolsResult.tools.map((tool: any) => ({
          name: tool.name,
          description: tool.description ?? "",
        }));
      } else {
        this.tools = [];
      }
    } catch (error) {
      this.tools = [];
    } finally {
      if (this.onToolsUpdatedCallback) {
        this.onToolsUpdatedCallback([...this.tools]);
      }
    }
  }

  private setUpNotifications(): void {
    this.client.setNotificationHandler(
      LoggingMessageNotificationSchema,
      console.info
    );
    this.client.setNotificationHandler(
      ToolListChangedNotificationSchema,
      this.listTools
    );
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

      const processedContent = content.reduce((_, item: any) => {
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
    if (this.transport == null) return;
    this.transport.onerror = this.cleanup;
  }

  async cleanup(): Promise<void> {
    await this.client.close();
    this.isConnected = false;
  }
}
