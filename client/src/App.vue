<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
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

  async callTool(name: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      console.log(`\n🔧 Calling tool: ${name}`);
      const args = this.getToolArguments(name);
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

  private getToolArguments(toolName: string): Record<string, any> {
    switch (toolName) {
      case "health":
      case "version":
      case "info":
      case "enable-vector-search":
      case "get-experimental-features":
        return {};
      case "list-indexes":
        return { limit: 20 };
      case "create-index":
        return { indexUid: "test-index", primaryKey: "id" };
      case "get-index":
        return { indexUid: this.meilisearchIndexUid };
      case "delete-index":
        return { indexUid: "test-index" };
      case "search":
        return { indexUid: this.meilisearchIndexUid, q: "action" };
      case "get-documents":
        return { indexUid: this.meilisearchIndexUid, limit: 5 };
      case "add-documents":
        return {
          indexUid: this.meilisearchIndexUid,
          documents: JSON.stringify([
            { id: "1", title: "Test Document 1" },
            { id: "2", title: "Test Document 2" },
          ]),
        };
      case "get-settings":
      case "get-searchable-attributes":
      case "get-displayed-attributes":
      case "get-embedders":
      case "stats":
        return { indexUid: this.meilisearchIndexUid };
      default:
        console.log(
          `⚠️ No specific arguments defined for tool ${toolName}, using empty object`
        );
        return {};
    }
  }

  private setUpTransport(): void {
    if (this.transport === null) return;
    this.transport.onclose = () => {
      console.log("🔌 Transport closed");
      this.isCompleted = true;
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
    this.isCompleted = true;
    await this.cleanup();
  }
}

const toolCallResult = ref<any>(null);
const isLoadingClient = ref(true);
const isLoadingToolCall = ref(false);
const clientError = ref<string | null>(null);
const mcpClient = ref<MCPClient | null>(null);
const availableTools = ref<{ name: string; description: string }[]>([]);

onMounted(async () => {
  isLoadingClient.value = true;
  clientError.value = null;
  const client = new MCPClient("meilisearch-vue-client");

  client.setOnToolsUpdatedCallback((updatedTools) => {
    availableTools.value = updatedTools;
  });

  try {
    await client.connectToServer("http://localhost:8080/mcp");
    mcpClient.value = client;
  } catch (e) {
    console.error("❌ Fatal error during MCP client setup:", e);
    clientError.value = e instanceof Error ? e.message : String(e);
  } finally {
    isLoadingClient.value = false;
  }
});

onUnmounted(async () => {
  if (mcpClient.value) {
    console.log("🔌 Component unmounting, closing MCP client...");
    await mcpClient.value.close();
  }
});

async function generalCallTool(toolName: string) {
  if (!mcpClient.value) {
    clientError.value = "Client not connected. Cannot call tool.";
    toolCallResult.value = { success: false, error: clientError.value };
    return;
  }
  isLoadingToolCall.value = true;
  toolCallResult.value = null;
  clientError.value = null;

  try {
    const result = await mcpClient.value.callTool(toolName);
    toolCallResult.value = result;
    if (!result.success) {
      console.warn(`Tool call '${toolName}' failed: ${result.error}`);
    }
  } catch (e) {
    console.error(`❌ Error calling tool ${toolName}:`, e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    toolCallResult.value = { success: false, error: errorMessage };
    clientError.value = `Error calling tool '${toolName}': ${errorMessage}`;
  } finally {
    isLoadingToolCall.value = false;
  }
}

async function refreshToolsList() {
  if (mcpClient.value) {
    isLoadingClient.value = true;
    clientError.value = null;
    try {
      await mcpClient.value.listTools();
    } catch (e) {
      console.error("Error refreshing tools list:", e);
      clientError.value = e instanceof Error ? e.message : String(e);
    } finally {
      isLoadingClient.value = false;
    }
  }
}
</script>

<template>
  <div>
    <h1>MCP Client Interface</h1>
    <div v-if="isLoadingClient && !mcpClient">Connecting to MCP Server...</div>
    <div
      v-if="clientError"
      style="color: red; white-space: pre-wrap; margin-bottom: 1em"
    >
      <strong>Error:</strong> {{ clientError }}
    </div>
    <div v-if="mcpClient">
      <h2>Connection Status: <span style="color: green">Connected</span></h2>
      <div style="margin-bottom: 1em">
        <h3>Available Tools</h3>
        <button @click="refreshToolsList" :disabled="isLoadingClient">
          {{ isLoadingClient ? "Refreshing..." : "Refresh Tools List" }}
        </button>
        <ul v-if="availableTools.length > 0">
          <li v-for="tool in availableTools" :key="tool.name">
            <strong>{{ tool.name }}</strong
            >: {{ tool.description }}
          </li>
        </ul>
        <p v-else-if="!isLoadingClient">
          No tools currently available. Try refreshing.
        </p>
        <p v-if="isLoadingClient && availableTools.length === 0">
          Loading tools...
        </p>
      </div>
      <div style="margin-bottom: 1em">
        <button
          @click="generalCallTool('list-indexes')"
          :disabled="isLoadingToolCall || !mcpClient"
          style="margin-left: 10px"
        >
          {{ isLoadingToolCall ? "Calling..." : "List Indexes" }}
        </button>
      </div>
      <div
        v-if="toolCallResult"
        style="
          margin-top: 1em;
          padding: 1em;
          border: 1px solid #ccc;
          background-color: #f9f9f9;
        "
      >
        <h3>Last Tool Call Result:</h3>
        <div v-if="toolCallResult.success" style="color: green">Success!</div>
        <div
          v-if="!toolCallResult.success && toolCallResult.error"
          style="color: red"
        >
          Error: {{ toolCallResult.error }}
        </div>
        <pre style="white-space: pre-wrap; word-break: break-all">
          {{ JSON.stringify(toolCallResult.data || toolCallResult, null, 2) }}
        </pre>
      </div>
    </div>
    <div v-else-if="!isLoadingClient && !clientError">
      <p>
        Client not connected. Ensure the MCP server is running and accessible.
      </p>
    </div>
  </div>
</template>
