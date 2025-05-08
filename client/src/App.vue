<script setup lang="ts">
import { MCPClient } from "./client";
import { ref, onMounted, onUnmounted } from "vue";

const isLoadingClient = ref(true);
const isLoadingToolCall = ref(false);
const toolCallResult = ref<any>(null);
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

const callTool = async (toolName: string) => {
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
};
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
        <button
          @click="callTool('list-indexes')"
          :disabled="isLoadingToolCall || !mcpClient"
          style="margin-left: 10px"
        >
          {{ isLoadingToolCall ? "Calling..." : "List Indexes" }}
        </button>
      </div>
      <div
        v-if="toolCallResult"
        style="
          padding: 1em;
          margin-top: 1em;
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
      <div style="margin-bottom: 1em">
        <h3>Available Tools</h3>
        <ul v-if="availableTools.length">
          <li v-for="tool in availableTools" :key="tool.name">
            <strong>{{ tool.name }}</strong
            >: {{ tool.description }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
