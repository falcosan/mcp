import {
  TextContentSchema,
  LoggingMessageNotificationSchema,
  ToolListChangedNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export class MCPClient {
  /**
   * Indicates whether the client is connected to the MCP server
   * Used to track the connection state and control async operations
   */
  isConnected: boolean = false;

  /**
   * List of available tools provided by the MCP server
   * Each tool has a name and description
   */
  tools: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  }[] = [];

  private client: Client;
  private tries: number = 0;
  private transport: StreamableHTTPClientTransport | null = null;
  private toolsUpdatedCallback:
    | ((tools: Array<{ name: string; description: string }>) => void)
    | null = null;

  constructor(serverName: string) {
    this.client = new Client({ name: serverName, version: "1.0.0" });
  }

  /**
   * Registers a callback to be called when the list of available tools changes
   * @param callback The function to call when tools are updated
   */
  onToolsUpdatedCallback(
    callback: (tools: Array<{ name: string; description: string }>) => void
  ) {
    this.toolsUpdatedCallback = callback;
  }

  /**
   * Executes the provided callback once the client is connected to the server
   * Waits in a loop until the connection is established
   * @param callback The function to execute after connection is established
   * @returns The result of the callback function
   */
  async onConnected<T>(callback: () => T | Promise<T>): Promise<T> {
    while (!this.isConnected) {
      await new Promise((resolve) => setTimeout(resolve));
    }
    return callback();
  }

  /**
   * Connects to the MCP server with retry logic
   * @param serverUrl The URL of the MCP server to connect to
   * @throws Error if connection fails after 5 attempts
   */
  async connectToServer(serverUrl: string): Promise<void> {
    const url = new URL(serverUrl);
    try {
      this.transport = new StreamableHTTPClientTransport(url);
      await this.client.connect(this.transport);

      this.setUpTransport();
      this.setUpNotifications();

      await this.listTools();

      this.isConnected = true;
    } catch (error) {
      this.tries++;
      if (this.tries > 5) {
        this.isConnected = false;
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, this.tries * 1000));
      await this.connectToServer(serverUrl);
    }
  }

  private async listTools(): Promise<void> {
    try {
      const toolsResult = await this.client.listTools();

      if (!toolsResult) {
        this.tools = [];
      } else if (toolsResult.tools && Array.isArray(toolsResult.tools)) {
        this.tools = toolsResult.tools.map((tool: any) => ({
          name: tool.name,
          description: tool.description ?? "",
          parameters: tool.parameters || {},
        }));
      } else {
        this.tools = [];
      }
    } catch (error) {
      this.tools = [];
    } finally {
      if (this.toolsUpdatedCallback) {
        this.toolsUpdatedCallback([...this.tools]);
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

  /**
   * Calls a tool on the MCP server with optional arguments
   * Parses and processes the response from the server
   * @param name The name of the tool to call
   * @param args Optional arguments to pass to the tool
   * @returns Object containing success status and either data or error message
   */
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

      if (result.isError) {
        return {
          success: false,
          error: JSON.stringify(result.content),
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

  /**
   * Process a user query through the AI to determine which tool to use
   * @param query The user's query
   * @param specificTools Optional array of specific tools to consider
   * @returns The result of calling the selected tool, or an error
   */
  async callToolWithAI(
    query: string,
    specificTools?: string[]
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    toolUsed?: string;
    reasoning?: string;
  }> {
    try {
      const result = await this.callTool("process-ai-query", {
        query,
        specificTools,
      });

      if (!result.success) return result;

      const { toolName, parameters, reasoning } = result.data;

      if (!toolName) {
        return {
          success: false,
          error: "AI could not determine which tool to use for this query",
        };
      }

      const toolResult = await this.callTool(toolName, parameters);

      return {
        ...toolResult,
        reasoning,
        toolUsed: toolName,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `AI inference error: ${errorMessage}`,
      };
    }
  }

  private setUpTransport(): void {
    if (this.transport == null) return;
    this.transport.onerror = this.cleanup;
  }

  /**
   * Closes the connection to the server and resets the connection state
   * Called automatically on transport error or can be called manually
   */
  async cleanup(): Promise<void> {
    if (this.client == null) return;
    await this.client.close();
    this.isConnected = false;
  }
}
