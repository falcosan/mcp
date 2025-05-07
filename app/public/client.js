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
      } else if (contentType && contentType.includes("text/event-stream")) {
        return false;
      }

      console.error("No session ID found in response");
      return false;
    } catch (error) {
      console.error("Error initializing MCP session:", error);
      return false;
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
        if (!sessionId) {
          const initialized = await initializeMcpSession();
          if (!initialized) {
            resultsDiv.innerHTML =
              "<p>Error: Could not establish connection to search server</p>";
            return;
          }
        }

        const searchResponse = await fetch(`${MCP_SERVER_URL}/mcp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
            "mcp-session-id": sessionId,
          },
          body: JSON.stringify({
            method: "tools/call",
            params: { name: "list-indexes", arguments: { limit: 20 } },
            jsonrpc: "2.0",
            id: generateRequestId(),
          }),
        });

        const searchResults = await searchResponse.json();

        if (searchResults.error) {
          resultsDiv.innerHTML = `<p>Search error: ${
            searchResults.error.message || "Unknown error"
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

    if (
      !response.result ||
      !response.result.content ||
      !response.result.content[0]
    ) {
      resultsDiv.innerHTML = "<p>No results or invalid response format</p>";
      return;
    }

    try {
      const textContent = response.result.content[0].text;
      const searchData = JSON.parse(textContent);

      if (searchData.allHits && searchData.allHits.length > 0) {
        const resultsList = document.createElement("ul");
        searchData.allHits.forEach((hit) => {
          const listItem = document.createElement("li");
          const title = hit.title || hit.name || "Unnamed document";
          const source = hit._indexUid
            ? `<span class="index-name">[${hit._indexUid}]</span> `
            : "";

          listItem.innerHTML = `${source}<strong>${title}</strong>`;

          const details = [];
          if (hit.description) details.push(hit.description);
          if (hit.year) details.push(`Year: ${hit.year}`);
          if (hit.genre) details.push(`Genre: ${hit.genre}`);

          if (details.length > 0) {
            const detailsElem = document.createElement("div");
            detailsElem.className = "hit-details";
            detailsElem.textContent = details.join(" • ");
            listItem.appendChild(detailsElem);
          }

          resultsList.appendChild(listItem);
        });
        resultsDiv.appendChild(resultsList);

        const countElem = document.createElement("p");
        countElem.className = "results-count";
        countElem.textContent = `Found ${searchData.allHits.length} results`;
        resultsDiv.prepend(countElem);
      } else {
        resultsDiv.innerHTML = "<p>No matching documents found</p>";
      }
    } catch (error) {
      console.error("Error parsing search results:", error);
      resultsDiv.innerHTML = "<p>Error processing search results</p>";
    }
  }

  initializeMcpSession();
});
