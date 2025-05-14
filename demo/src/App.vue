<script setup lang="ts">
import { ref } from "vue";
import useMCPMeilisearch from "../composables/useMCPMeilisearch";

const searchQuery = ref<string>("");
const {
  error,
  tools,
  result,
  client,
  loading,
  searchAcrossAllIndexes,
  useLLMInference,
  toggleLLMInference,
} = useMCPMeilisearch();

const handleSearch = () => {
  searchAcrossAllIndexes(searchQuery.value);
};

const handleToggleLLM = (event: Event) => {
  const target = event.target as HTMLInputElement;
  toggleLLMInference(target.checked);
};
</script>

<template>
  <div>
    <h1>MCP Client</h1>
    <div v-if="loading.client && !client">Connecting to MCP Server...</div>
    <div v-if="error" style="color: red; margin-bottom: 1em">
      <strong>Error:</strong> {{ error }}
    </div>

    <div v-if="client">
      <h2>Connection Status: <span style="color: green">Connected</span></h2>

      <div style="margin: 20px 0">
        <div style="margin-bottom: 10px; display: flex; align-items: center">
          <input
            type="checkbox"
            :checked="useLLMInference"
            id="llm-toggle"
            @change="handleToggleLLM"
            style="margin-right: 5px"
          />
          <label for="llm-toggle">Use LLM inference for tool selection</label>
        </div>

        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search across all indexes"
          style="padding: 0.5em; width: 80%; margin-right: 10px"
          @keyup.enter="handleSearch"
        />
        <button
          :disabled="loading.tool"
          style="padding: 0.5em"
          @click="handleSearch"
        >
          {{ loading.tool ? "Searching..." : "Search" }}
        </button>
      </div>

      <div
        v-if="result"
        style="
          padding: 1em;
          margin-top: 1em;
          border: 1px solid #ccc;
          background-color: #f9f9f9;
        "
      >
        <div v-if="result.success" style="color: green">Success!</div>
        <div v-else style="color: red">Error: {{ result.error }}</div>

        <div v-if="useLLMInference && result.toolUsed" style="margin-top: 10px">
          <div><strong>Tool Used:</strong> {{ result.toolUsed }}</div>
          <div v-if="result.reasoning">
            <strong>LLM Reasoning:</strong>
            <p style="margin-top: 5px; font-style: italic">
              {{ result.reasoning }}
            </p>
          </div>
        </div>

        <pre style="margin-top: 1em; overflow: auto; max-height: 400px">{{
          result.data
        }}</pre>
      </div>

      <h3 style="margin-top: 2em">Available Tools</h3>
      <ul>
        <li v-for="tool in tools" :key="tool.name">
          <strong>{{ tool.name }}</strong
          >: {{ tool.description }}
        </li>
      </ul>
    </div>
  </div>
</template>
