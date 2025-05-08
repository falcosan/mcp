<script setup lang="ts">
import { MCPClient } from "./client";
import { ref, onMounted, onUnmounted } from "vue";

const result = ref<any>(null);
const error = ref<string | null>(null);
const client = ref<MCPClient | null>(null);
const loading = ref({ client: true, tool: false });
const tools = ref<{ name: string; description: string }[]>([]);

const callTool = async (name: string) => {
  if (!client.value) {
    error.value = "Client not connected";
    result.value = { success: false, error: error.value };
    return;
  }

  loading.value.tool = true;
  result.value = null;
  error.value = null;

  try {
    result.value = await client.value.callTool(name);
    if (!result.value.success)
      error.value = `Tool failed: ${result.value.error}`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.value = { success: false, error: msg };
    error.value = `Error: ${msg}`;
  } finally {
    loading.value.tool = false;
  }
};

onMounted(async () => {
  const mcp = new MCPClient("meilisearch-vue-client");
  mcp.setOnToolsUpdatedCallback((t) => (tools.value = t));

  try {
    await mcp.connectToServer("http://localhost:8080/mcp");
    client.value = mcp;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value.client = false;
  }
});

onUnmounted(() => client.value?.close());
</script>

<template>
  <div>
    <h1>MCP Client Interface</h1>
    <div v-if="loading.client && !client">Connecting to MCP Server...</div>
    <div v-if="error" style="color: red; margin-bottom: 1em">
      <strong>Error:</strong> {{ error }}
    </div>

    <div v-if="client">
      <h2>Connection Status: <span style="color: green">Connected</span></h2>

      <button
        @click="callTool('list-indexes')"
        :disabled="loading.tool"
        style="margin: 10px 0"
      >
        {{ loading.tool ? "Calling..." : "List Indexes" }}
      </button>

      <div
        v-if="result"
        style="
          padding: 1em;
          margin-top: 1em;
          border: 1px solid #ccc;
          background-color: #f9f9f9;
        "
      >
        <h3>Last Tool Call Result:</h3>
        <div v-if="result.success" style="color: green">Success!</div>
        <div v-else-if="result.error" style="color: red">
          Error: {{ result.error }}
        </div>
        <pre style="white-space: pre-wrap">{{
          JSON.stringify(result.data || result, null, 2)
        }}</pre>
      </div>

      <h3>Available Tools</h3>
      <ul v-if="tools.length">
        <li v-for="tool in tools" :key="tool.name">
          <strong>{{ tool.name }}</strong
          >: {{ tool.description }}
        </li>
      </ul>
    </div>
  </div>
</template>
