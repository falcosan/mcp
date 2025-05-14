import { MCPClient } from "../../dist/client";
import { ref, onMounted, onUnmounted } from "vue";

export interface MCPMeilisearchResult {
  success: boolean;
  data?: unknown;
  error?: string;
  toolUsed?: string;
  reasoning?: string;
}

export interface MCPTool {
  name: string;
  description: string;
}

export default function useMCPMeilisearch() {
  const tools = ref<MCPTool[]>([]);
  const error = ref<string | null>(null);
  const client = ref<MCPClient | null>(null);
  const loading = ref({ client: true, tool: false });
  const result = ref<MCPMeilisearchResult | null>(null);
  const useAI = ref<boolean>(false);

  const callTool = async (
    name: string,
    params: Record<string, unknown> = {}
  ) => {
    if (!client.value) {
      error.value = "Client not connected";
      result.value = { success: false, error: error.value };
      return;
    }

    loading.value.tool = true;
    result.value = null;
    error.value = null;

    try {
      result.value = await client.value.callTool(name, params);
      if (!result.value.success) {
        error.value = `Tool failed: ${result.value.error}`;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.value = { success: false, error: msg };
      error.value = `Error: ${msg}`;
    } finally {
      loading.value.tool = false;
    }
  };

  const callToolWithAI = async (query: string, specificTools?: string[]) => {
    if (!client.value) {
      error.value = "Client not connected";
      result.value = { success: false, error: error.value };
      return;
    }

    loading.value.tool = true;
    result.value = null;
    error.value = null;

    try {
      const response = await client.value.callToolWithAI(query, specificTools);
      result.value = response;
      if (!response?.success) {
        error.value = response.error || "Query processing failed:";
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.value = { success: false, error: msg };
      error.value = `Error: ${msg}`;
    } finally {
      loading.value.tool = false;
    }
  };

  const searchAcrossAllIndexes = async (query: string) => {
    if (!query.trim()) {
      error.value = "Search query cannot be empty";
      return;
    }

    if (useAI.value) {
      await callToolWithAI(query);
    } else {
      await callTool("search-across-all-indexes", { q: query });
    }
  };

  const toggleAIInference = (value: boolean) => {
    useAI.value = value;
    if (client.value) {
      client.value.setUseAI(value);
    }
  };

  onMounted(async () => {
    const mcp = new MCPClient("meilisearch-vue-client");
    mcp.onToolsUpdatedCallback((t) => (tools.value = t));

    try {
      await mcp.connectToServer("http://localhost:4995/mcp");
      client.value = mcp;
      mcp.setUseAI(useAI.value);
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value.client = false;
    }
  });

  onUnmounted(() => {
    client.value?.cleanup();
  });

  return {
    error,
    tools,
    result,
    client,
    loading,
    callTool,
    useAI,
    callToolWithAI,
    toggleAIInference,
    searchAcrossAllIndexes,
  };
}
