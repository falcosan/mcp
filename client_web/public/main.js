class MCPDisplay {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.sessionId = null;
    this.endpoint = `${serverUrl}/mcp`;
  }

  generateRequestId() {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }

  async initialize() {
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: {
              name: "mcp-client-for-meilisearch-client",
              version: "1.0.0",
            },
          },
          jsonrpc: "2.0",
          id: this.generateRequestId(),
        }),
      });

      this.sessionId = response.headers.get("mcp-session-id");

      if (!this.sessionId) {
        const data = await response.json();
        this.sessionId = data.result?.sessionId;
      }

      return !!this.sessionId;
    } catch (error) {
      console.error("Failed to initialize MCP session:", error);
      return false;
    }
  }

  async callTool(toolName, toolArgs = {}) {
    if (!this.sessionId && !(await this.initialize())) {
      throw new Error("Could not establish connection to search server");
    }

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          "mcp-session-id": this.sessionId,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            name: toolName,
            arguments: toolArgs,
          },
          id: this.generateRequestId(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const jsonResponse = await response.json();
        return jsonResponse.result?.data || jsonResponse;
      } else {
        const text = await response.text();
        const dataMatch = text.match(/data: (.*)/);
        if (!dataMatch?.[1]) throw new Error("Invalid response format");

        const parsedResponse = JSON.parse(dataMatch[1]);
        const contentText = parsedResponse.result.content[0].text;
        return JSON.parse(contentText);
      }
    } catch (error) {
      console.error(`Error calling tool '${toolName}':`, error);
      throw error;
    }
  }
}

class SearchUI {
  constructor(client, searchInputId, resultsId) {
    this.client = client;
    this.searchInput = document.getElementById(searchInputId);
    this.resultsDiv = document.getElementById(resultsId);
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") this.performSearch();
    });
  }

  async performSearch() {
    const query = this.searchInput.value.trim();
    if (!query) return;

    this.showLoading();

    try {
      const searchResults = await this.client.callTool(
        "search-across-all-indexes",
        { q: query }
      );
      this.displayResults(searchResults);
    } catch (error) {
      this.showError(error.message);
    }
  }

  showLoading() {
    this.resultsDiv.innerHTML = `<pre class="loading">Processing...</pre>`;
  }

  showError(message) {
    this.resultsDiv.innerHTML = `<pre class="error">Error: ${message}</pre>`;
  }

  displayResults(response) {
    const hits = response.allHits || [];

    if (!hits.length) {
      this.resultsDiv.innerHTML = "<pre>No matching documents found</pre>";
      return;
    }

    const resultsList = document.createElement("ul");
    hits.forEach((hit) => {
      const title = hit.title || hit.name || hit.id || "Unnamed document";
      const item = document.createElement("li");
      item.innerHTML = `<span><i>${hit.indexUid}</i></span><br><strong>${title}</strong>`;
      resultsList.appendChild(item);
    });

    this.resultsDiv.innerHTML = `<pre class="results-count">Found ${hits.length} results</pre>`;
    this.resultsDiv.appendChild(resultsList);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const client = new MCPDisplay("http://localhost:8080");
  new SearchUI(client, "searchInput", "results");
  client.initialize();
});
