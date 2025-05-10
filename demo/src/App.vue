<script setup lang="ts">
import { ref } from "vue";
import useMCPMeilisearch from "../composables/useMCPMeilisearch";

const searchQuery = ref<string>("");
const { error, tools, result, client, loading, searchAcrossAllIndexes } =
  useMCPMeilisearch();

const handleSearch = () => {
  searchAcrossAllIndexes(searchQuery.value);
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
        <div v-else-if="result.error" style="color: red">
          Error: {{ result.error }}
        </div>
        <pre style="white-space: pre-wrap">
        {{ JSON.stringify(result.data || result, null, 2) }}
        </pre>
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
