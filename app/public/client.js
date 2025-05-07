document.addEventListener("DOMContentLoaded", function () {
  const MCP_SERVER_URL = "http://localhost:3000";

  const searchInput = document.getElementById("searchInput");
  const resultsDiv = document.getElementById("results");

  let sessionId = null;

  async function initializeMcpSession() {
    try {
      const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
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
          id: generateRequestId(),
        }),
      });

      let headerSessionId = response.headers.get("mcp-session-id");

      if (headerSessionId) {
        sessionId = headerSessionId;
        return true;
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();

        if (data.result && data.result.sessionId) {
          sessionId = data.result.sessionId;
          return true;
        } else if (data.error) {
          console.error("Failed to initialize MCP session:", data.error);
          return false;
        }
      }

      console.error("No session ID found in response");
      return false;
    } catch (error) {
      console.error("Error initializing MCP session:", error);
      return false;
    }
  }

  async function callMcpTool(toolName, toolArgs) {
    try {
      if (!sessionId) {
        const initialized = await initializeMcpSession();
        if (!initialized) {
          throw new Error("Could not establish connection to search server");
        }
      }

      const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          "mcp-session-id": sessionId,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            name: toolName,
            arguments: toolArgs || {},
          },
          id: generateRequestId(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const jsonResponse = await response.json();

        if (jsonResponse.result && jsonResponse.result.data) {
          return jsonResponse.result.data;
        }

        return jsonResponse;
      } else {
        const text = await response.text();
        return parseApiResponse(text);
      }
    } catch (error) {
      console.error(`Error calling tool '${toolName}':`, error);
      throw error;
    }
  }

  function parseApiResponse(text) {
    try {
      const dataMatch = text.match(/data: (.*)/);
      if (!dataMatch || !dataMatch[1]) {
        throw new Error("Failed to extract data portion from response");
      }
      const parsedResponse = JSON.parse(dataMatch[1]);
      const contentText = parsedResponse.result.content[0].text;

      return JSON.parse(contentText);
    } catch (error) {
      console.error("Error parsing API response:", error);
      throw new Error(
        `Failed to parse: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  function generateRequestId() {
    return `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  searchInput.addEventListener("keyup", async function (e) {
    if (e.key === "Enter") {
      const query = searchInput.value;
      if (!query.trim()) return;

      resultsDiv.innerHTML = "<p>Searching...</p>";

      try {
        const searchResults = await callMcpTool("search-across-all-indexes", {
          q: query,
          limit: 20,
        });

        if (searchResults.error) {
          resultsDiv.innerHTML = `<p>Search error: ${
            searchResults.error.message || JSON.stringify(searchResults.error)
          }</p>`;
          return;
        }

        displayResults(searchResults);
      } catch (error) {
        resultsDiv.innerHTML = `<p>Error: ${error.message}</p>`;
      }
    }
  });

  function displayResults(response) {
    resultsDiv.innerHTML = "";

    if (!response.allHits?.length) {
      resultsDiv.innerHTML = "<p>No results or invalid response format</p>";
      return;
    }

    try {
      const hits = response.allHits;

      if (hits.length) {
        const resultsList = document.createElement("ul");

        hits.forEach((hit) => {
          const listItem = document.createElement("li");
          const title = hit.title || hit.name || hit.id || "Unnamed document";

          listItem.innerHTML = `<strong>${title}</strong>`;
          resultsList.appendChild(listItem);
        });

        resultsDiv.appendChild(resultsList);

        const countElem = document.createElement("p");
        countElem.className = "results-count";
        countElem.textContent = `Found ${hits.length} results`;
        resultsDiv.prepend(countElem);
      } else {
        resultsDiv.innerHTML = "<p>No matching documents found</p>";
      }
    } catch (error) {
      console.error("Error parsing results:", error);
      resultsDiv.innerHTML = "<p>Error processing results</p>";
    }
  }

  initializeMcpSession();
});
