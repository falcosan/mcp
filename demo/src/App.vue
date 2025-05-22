<script setup lang="ts">
import { ref } from "vue";
import useMCPMeilisearch from "./composables/useMCPMeilisearch";

const searchQuery = ref<string>("busca articulos que hablan del pepino");
const {
  error,
  tools,
  result,
  useAI,
  client,
  loading,
  toggleAIInference,
  useHybridResponse,
  toggleHybridResponse,
  searchAcrossAllIndexes,
} = useMCPMeilisearch();

const handleSearch = () => {
  searchAcrossAllIndexes(searchQuery.value);
};

const handleToggleAI = (event: Event) => {
  const target = event.target as HTMLInputElement;
  toggleAIInference(target.checked);
};

const handleToggleHybridResponse = (event: Event) => {
  const target = event.target as HTMLInputElement;
  toggleHybridResponse(target.checked);
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
            :checked="useAI"
            id="ai-toggle"
            @change="handleToggleAI"
            style="margin-right: 5px"
          />
          <label for="ai-toggle" style="margin-right: 15px">Use AI</label>

          <input
            type="checkbox"
            :checked="useHybridResponse"
            id="hybrid-toggle"
            @change="handleToggleHybridResponse"
            style="margin-right: 5px"
            :disabled="!useAI"
          />
          <label for="hybrid-toggle">Hybrid Response</label>
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

        <div v-if="useAI && result.toolUsed" style="margin-top: 1em">
          <div><strong>Tool Used:</strong> {{ result.toolUsed }}</div>

          <div v-if="result.summary" style="margin-top: 1em">
            <strong>Summary:</strong>
            <div
              style="
                margin-top: 5px;
                padding: 10px;
                background-color: #f0f8ff;
                border-left: 4px solid #0077cc;
              "
              v-html="result.summary"
            />
          </div>

          <div v-if="result.reasoning" style="margin-top: 1em">
            <strong>Reasoning:</strong>
            <p style="margin-top: 5px; font-style: italic">
              {{ result.reasoning }}
            </p>
          </div>
        </div>

        <div style="margin-top: 1em">
          <strong>Result Data:</strong>
          <pre
            style="
              overflow: auto;
              max-height: 400px;
              margin-top: 5px;
              background-color: #f5f5f5;
              padding: 10px;
              border-radius: 4px;
            "
            >{{ result.data }}</pre
          >
        </div>
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
