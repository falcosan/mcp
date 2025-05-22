# MCP Meilisearch API Server

A Model Context Protocol (MCP) server implementation that provides a bridge between AI models and the Meilisearch search engine.

## Overview

- **MCP Server**: Exposes Meilisearch APIs as tools using the Model Context Protocol.
- **Web Client Demo**: A demo interface showcasing search functionalities.
- **AI Inference**: Intelligent tool selection based on user queries.

## Key Features

- **Multiple Transport Options**: Supports both STDIO and StreamableHTTP transports.
- **Meilisearch API Support**: Full access to Meilisearch functionalities.
- **Web Client Demo**: Updated interface showcasing search capabilities and features.
- **AI Inference**: Leverages LLMs from providers such as OpenAIo HuggingFace to intelligently determine and utilize the most suitable tool for user queries.

## Getting Started

### Prerequisites

- Node.js v20 or higher.
- A running Meilisearch instance (local or remote).
- API key for Meilisearch (if required).
- AI provider API key (if using AI inference).

### Installation

Install the package:

```bash
# Using npm
npm install mcp-meilisearch

# Using yarn
yarn add mcp-meilisearch

# Using pnpm
pnpm add mcp-meilisearch
```

### Options

#### Meilisearch Connection Options

- `meilisearchHost`: URL of the Meilisearch instance (Default: "http://localhost:7700")
- `meilisearchApiKey`: API key for authenticating with Meilisearch (Default: "")

#### MCP Server Options

- `transport`: Transport type for MCP server ("http" | "stdio") (Default: "http")
- `httpPort`: HTTP port for MCP server (Default: 4995)
- `mcpEndpoint`: MCP endpoint path (Default: "/mcp")

#### Session Options

- `sessionTimeout`: Session timeout in milliseconds (Default: 3600000)
- `sessionCleanupInterval`: Session cleanup interval in milliseconds (Default: 60000)

#### AI Inference Options

- `aiProviderName`: Name of the AI provider ("openai" | "huggingface" | "openrouter" | "ollama") (Default: "openai")
- `aiProviderApiKey`: AI provider API key for AI inference
- `llmModel`: AI model to use (Default: "gpt-3.5-turbo")

Please be aware that not all models support function calling, which is required for proper AI inference in this package. Make sure to select a model that supports the tools parameter.

| Provider    | Supported Models                                                                              |
| ----------- | --------------------------------------------------------------------------------------------- |
| OpenAI      | [List of supported models](https://platform.openai.com/docs/models)                           |
| OpenRouter  | [List of supported models](https://openrouter.ai/models?fmt=cards&supported_parameters=tools) |
| HuggingFace | [List of supported models](https://huggingface.co/models?other=function+calling)              |
| Ollama      | [List of supported models](https://ollama.com/search?c=tools)                                 |

#### Example server setup

```typescript
await mcpMeilisearchServer({
  meilisearchHost: "http://localhost:7700",
  aiProviderName: "openrouter",
  aiProviderApiKey: "your_openrouter_api_key",
  llmModel: "anthropic/claude-3-opus", // Make sure to use a model that supports function calling
});
```

### Using the MCPClient

The package exports the MCPClient class for client-side integration:

```typescript
import { MCPClient } from "mcp-meilisearch/client";

const client = new MCPClient("mcp-meilisearch-client");

await client.connectToServer("http://localhost:4995/mcp");

const result = await client.callTool("global-search", {
  q: "search kiosco antonio",
});

// Use AI inference to choose the most appropriate tool

const result = await client.callToolWithAI("Find articles about cucumber");
console.log(`Tool used: ${result.toolUsed}`);
console.log(`Reasoning: ${result.reasoning}`);
console.log(`Results: ${JSON.stringify(result.data)}`);
```

#### AI Inference Client Methods

#### `callToolWithAI(query, options)`

Processes a user query through AI to determine and execute the most appropriate tool.

**Parameters:**

- `query`: String - The user's query or request to be processed
- `options`: Object (Optional) - Configuration options
  - `specificTools`: String[] (Optional) - Restricts tool selection to this list of tool names
  - `justReasoning`: Boolean (Optional) - When set to `true`, returns only the AI's reasoning without executing the
    selected tool
  - `withSummary`: Boolean (Optional) - When set to `true`, generates a concise summary of the search results along with the regular response

### Starting the Server

You can start the server programmatically:

```typescript
import mcpMeilisearchServer from "mcp-meilisearch";

await mcpMeilisearchServer({
  meilisearchHost: "http://localhost:7700",
  meilisearchApiKey: "your_meilisearch_api_key",
  aiProviderName: "openai",
  aiProviderApiKey: "your_ai_provider_api_key",
  llmModel: "gpt-4",
});
```

## Tools

The MCP server exposes various tools that allow you to interact with Meilisearch functionalities. Each tool corresponds to a specific Meilisearch API endpoint, enabling you to perform operations such as searching, indexing, and managing documents.

### Tool Categories

1. **System Tools**: Health checks, version info, server stats.
2. **Index Tools**: Manage indexes (create, update, delete, list).
3. **Document Tools**: Add, update, delete, and retrieve documents.
4. **Search Tools**: Advanced search, including vector search.
5. **Settings Tools**: Configure index settings.
6. **Task Tools**: Manage asynchronous tasks.
7. **Vector Tools**: Experimental vector search capabilities.

### System Tools

#### health

- **Description**: Check if the Meilisearch server is healthy.

#### version

- **Description**: Get the version information of the Meilisearch server.

#### info

- **Description**: Get the system information of the Meilisearch server.

#### stats

- **Description**: Get statistics about all indexes or a specific index.
- **Parameters**:
  - `indexUid` (string, optional): Unique identifier of the index.

#### get-tasks

- **Description**: Get information about tasks with optional filtering.
- **Parameters**:
  - `limit` (number, optional): Maximum number of tasks to return.
  - `from` (number, optional): Task uid from which to start fetching.
  - `status` (string, optional): Status of tasks to return.
  - `type` (string, optional): Type of tasks to return.
  - `indexUids` (string[], optional): UIDs of the indexes on which tasks were performed.

#### delete-tasks

- **Description**: Delete tasks based on provided filters.
- **Parameters**:
  - `statuses` (string[], optional): Statuses of tasks to delete.
  - `types` (string[], optional): Types of tasks to delete.
  - `indexUids` (string[], optional): UIDs of the indexes on which tasks to delete were performed.
  - `uids` (number[], optional): UIDs of the tasks to delete.
  - `canceledBy` (number[], optional): UIDs of the tasks that canceled tasks to delete.
  - `beforeUid` (number, optional): Delete tasks whose uid is before this value.
  - `beforeStartedAt` (string, optional): Delete tasks that started processing before this date (ISO 8601 format).
  - `beforeFinishedAt` (string, optional): Delete tasks that finished processing before this date (ISO 8601 format).

### Index Tools

#### list-indexes

- **Description**: List all indexes in the Meilisearch instance.
- **Parameters**:
  - `limit` (number, optional): Maximum number of indexes to return.
  - `offset` (number, optional): Number of indexes to skip.

#### get-index

- **Description**: Get information about a specific Meilisearch index.
- **Parameters**:
  - `indexUid` (string, required): Unique identifier of the index.

#### create-index

- **Description**: Create a new Meilisearch index.
- **Parameters**:
  - `indexUid` (string, required): Unique identifier for the new index.
  - `primaryKey` (string, optional): Primary key for the index.

#### update-index

- **Description**: Update a Meilisearch index (currently only supports updating the primary key).
- **Parameters**:
  - `indexUid` (string, required): Unique identifier of the index.
  - `primaryKey` (string, required): New primary key for the index.

#### delete-index

- **Description**: Delete a Meilisearch index.
- **Parameters**:
  - `indexUid` (string, required): Unique identifier of the index to delete.

#### swap-indexes

- **Description**: Swap two or more indexes in Meilisearch.
- **Parameters**:
  - `indexes` (string, required): JSON array of index pairs to swap, e.g. [["movies", "movies_new"]].

### Document Tools

#### get-documents

- **Description**: Get documents from a Meilisearch index.
- **Parameters**:
  - `indexUid` (string, required): Unique identifier of the index.
  - `limit` (number, optional): Maximum number of documents to return (default: 20).
  - `offset` (number, optional): Number of documents to skip (default: 0).
  - `fields` (string[], optional): Fields to return in the documents.
  - `filter` (string, optional): Filter query to apply.

#### get-document

- **Description**: Get a document by its ID from a Meilisearch index.
- **Parameters**:
  - `indexUid` (string, required): Unique identifier of the index.
  - `documentId` (string, required): ID of the document to retrieve.
  - `fields` (string[], optional): Fields to return in the document.

#### add-documents

- **Description**: Add documents to a Meilisearch index.
- **Parameters**:
  - `indexUid` (string, required): Unique identifier of the index.
  - `documents` (string, required): JSON array of documents to add.
  - `primaryKey` (string, optional): Primary key for the documents.

#### update-documents

- **Description**: Update documents in a Meilisearch index.
- **Parameters**:
  - `indexUid` (string, required): Unique identifier of the index.
  - `documents` (string, required): JSON array of documents to update.
  - `primaryKey` (string, optional): Primary key for the documents.

#### delete-document

- **Description**: Delete a document by its ID from a Meilisearch index.
- **Parameters**:
  - `indexUid` (string, required): Unique identifier of the index.
  - `documentId` (string, required): ID of the document to delete.

#### delete-documents

- **Description**: Delete multiple documents by their IDs from a Meilisearch index.
- **Parameters**:
  - `indexUid` (string, required): Unique identifier of the index.
  - `documentIds` (string, required): JSON array of document IDs to delete.

#### delete-all-documents

- **Description**: Delete all documents in a Meilisearch index.
- **Parameters**:
  - `indexUid` (string, required): Unique identifier of the index.

### Search Tools

#### search

- **Description**: Search for documents in a Meilisearch index.
- **Parameters**:
  - `indexUid` (string, required): Unique identifier of the index.
  - `q` (string, required): Search query.
  - `limit` (number, optional): Maximum number of results to return (default: 20).
  - `offset` (number, optional): Number of results to skip (default: 0).
  - `filter` (string, optional): Filter query to apply.
  - `sort` (string[], optional): Attributes to sort by, e.g. ["price:asc"].
  - `facets` (string[], optional): Facets to return.
  - `attributesToRetrieve` (string[], optional): Attributes to include in results.
  - `attributesToCrop` (string[], optional): Attributes to crop.
  - `cropLength` (number, optional): Length at which to crop cropped attributes.
  - `attributesToHighlight` (string[], optional): Attributes to highlight.
  - `highlightPreTag` (string, optional): Tag to insert before highlighted text.
  - `highlightPostTag` (string, optional): Tag to insert after highlighted text.
  - `showMatchesPosition` (boolean, optional): Whether to include match positions in results.
  - `matchingStrategy` (string, optional): Matching strategy: 'all' or 'last'.

#### multi-search

- **Description**: Perform multiple searches in one request.
- **Parameters**:
  - `queries` (string, required): JSON array of search queries, each containing the same parameters as the `search` tool.

#### global-search

- **Description**: Search for a term across all available Meilisearch indexes and return combined results.
- **Parameters**:
  - `q` (string, required): Search query.
  - `limit` (number, optional): Maximum number of results to return per index (default: 20).
  - `attributesToRetrieve` (string[], optional): Attributes to include in results.

#### facet-search

- **Description**: Search for facet values matching specific criteria.
- **Parameters**:
  - `indexUid` (string, required): Unique identifier of the index.
  - `facetName` (string, required): Name of the facet to search.
  - `facetQuery` (string, optional): Query to match against facet values.
  - `filter` (string, optional): Filter to apply to the base search.

### Settings Tools

#### get-settings

- **Description**: Get all settings for a Meilisearch index.
- **Parameters**:
  - `indexUid` (string, required): Unique identifier of the index.

#### update-settings

- **Description**: Update settings for a Meilisearch index.
- **Parameters**:
  - `indexUid` (string, required): Unique identifier of the index.
  - `settings` (string, required): JSON object containing settings to update.

#### reset-settings

- **Description**: Reset all settings for a Meilisearch index to their default values.
- **Parameters**:
  - `indexUid` (string, required): Unique identifier of the index.

#### Get Settings Tools

The following tools retrieve specific settings for a Meilisearch index:

- **get-displayed-attributes**
- **get-searchable-attributes**
- **get-filterable-attributes**
- **get-sortable-attributes**
- **get-ranking-rules**
- **get-stop-words**
- **get-synonyms**
- **get-typo-tolerance**
- **get-pagination**
- **get-faceting**
- **get-dictionary**
- **get-proximity-precision**
- **get-separator-tokens**
- **get-non-separator-tokens**
- **get-word-dictionary**

All these tools have the same parameter:

- `indexUid` (string, required): Unique identifier of the index.

#### Update Settings Tools

The following tools update specific settings for a Meilisearch index:

- **update-displayed-attributes**

  - `indexUid` (string, required): Unique identifier of the index.
  - `displayedAttributes` (string, required): JSON array of attributes to display, e.g. ["title", "description"].

- **update-searchable-attributes**

  - `indexUid` (string, required): Unique identifier of the index.
  - `searchableAttributes` (string, required): JSON array of attributes that can be searched, e.g. ["title", "description"].

- **update-filterable-attributes**

  - `indexUid` (string, required): Unique identifier of the index.
  - `filterableAttributes` (string, required): JSON array of attributes that can be used as filters, e.g. ["genre", "director"].

- **update-sortable-attributes**

  - `indexUid` (string, required): Unique identifier of the index.
  - `sortableAttributes` (string, required): JSON array of attributes that can be used for sorting, e.g. ["price", "date"].

- **update-ranking-rules**

  - `indexUid` (string, required): Unique identifier of the index.
  - `rankingRules` (string, required): JSON array of ranking rules, e.g. ["typo", "words", "proximity", "attribute", "sort", "exactness"].

- **update-stop-words**

  - `indexUid` (string, required): Unique identifier of the index.
  - `stopWords` (string, required): JSON array of words to ignore in search queries, e.g. ["the", "a", "an"].

- **update-synonyms**

  - `indexUid` (string, required): Unique identifier of the index.
  - `synonyms` (string, required): JSON object mapping words to their synonyms, e.g. {"movie": ["film"]}.

- **update-typo-tolerance**

  - `indexUid` (string, required): Unique identifier of the index.
  - `typoTolerance` (string, required): JSON object with typo tolerance configuration, e.g. {"enabled": true, "minWordSizeForTypos": {"oneTypo": 5, "twoTypos": 9}}.

- **update-pagination**

  - `indexUid` (string, required): Unique identifier of the index.
  - `pagination` (string, required): JSON object with pagination configuration, e.g. {"maxTotalHits": 1000}.

- **update-faceting**

  - `indexUid` (string, required): Unique identifier of the index.
  - `faceting` (string, required): JSON object with faceting configuration, e.g. {"maxValuesPerFacet": 100}.

- **update-dictionary**

  - `indexUid` (string, required): Unique identifier of the index.
  - `dictionary` (string, required): JSON array of words to consider as a single word, e.g. ["San Francisco", "New York"].

- **update-proximity-precision**

  - `indexUid` (string, required): Unique identifier of the index.
  - `proximityPrecision` (string, required): String with proximity precision value, can be 'byWord' or 'byAttribute'.

- **update-separator-tokens**

  - `indexUid` (string, required): Unique identifier of the index.
  - `separatorTokens` (string, required): JSON array of tokens that should be considered as word separators, e.g. ["-", "_"].

- **update-non-separator-tokens**

  - `indexUid` (string, required): Unique identifier of the index.
  - `nonSeparatorTokens` (string, required): JSON array of tokens that should not be considered as word separators, e.g. ["@", "."].

- **update-word-dictionary**
  - `indexUid` (string, required): Unique identifier of the index.
  - `wordDictionary` (string, required): JSON array of custom words to add to the dictionary, e.g. ["cbuilder", "meilisearch"].

#### Reset Settings Tools

The following tools reset specific settings for a Meilisearch index to their default values:

- **reset-displayed-attributes**
- **reset-searchable-attributes**
- **reset-filterable-attributes**
- **reset-sortable-attributes**
- **reset-ranking-rules**
- **reset-stop-words**
- **reset-synonyms**
- **reset-typo-tolerance**
- **reset-pagination**
- **reset-faceting**
- **reset-dictionary**
- **reset-proximity-precision**
- **reset-separator-tokens**
- **reset-non-separator-tokens**
- **reset-word-dictionary**

All these reset tools have the same parameter:

- `indexUid` (string, required): Unique identifier of the index.

### Task Tools

#### list-tasks

- **Description**: List tasks with optional filtering.
- **Parameters**:
  - `limit` (number, optional): Maximum number of tasks to return.
  - `from` (number, optional): Task uid from which to start fetching.
  - `statuses` (string[], optional): Statuses of tasks to return.
  - `types` (string[], optional): Types of tasks to return.
  - `indexUids` (string[], optional): UIDs of the indexes on which tasks were performed.
  - `uids` (number[], optional): UIDs of specific tasks to return.

#### get-task

- **Description**: Get information about a specific task.
- **Parameters**:
  - `taskUid` (number, required): Unique identifier of the task.

#### cancel-tasks

- **Description**: Cancel tasks based on provided filters.
- **Parameters**:
  - `statuses` (string[], optional): Statuses of tasks to cancel.
  - `types` (string[], optional): Types of tasks to cancel.
  - `indexUids` (string[], optional): UIDs of the indexes on which tasks to cancel were performed.
  - `uids` (number[], optional): UIDs of the tasks to cancel.

#### wait-for-task

- **Description**: Wait for a specific task to complete.
- **Parameters**:
  - `taskUid` (number, required): Unique identifier of the task to wait for.
  - `timeoutMs` (number, optional): Maximum time to wait in milliseconds (default: 5000).
  - `intervalMs` (number, optional): Polling interval in milliseconds (default: 500).

### Vector Tools

#### enable-vector-search

- **Description**: Enable the vector search experimental feature in Meilisearch.

#### get-experimental-features

- **Description**: Get the status of experimental features in Meilisearch.

#### update-embedders

- **Description**: Configure embedders for vector search.
- **Parameters**:
  - `indexUid` (string, required): Unique identifier of the index.
  - `embedders` (string, required): JSON object containing embedder configurations.

#### get-embedders

- **Description**: Get the embedders configuration for an index.
- **Parameters**:
  - `indexUid` (string, required): Unique identifier of the index.

#### reset-embedders

- **Description**: Reset the embedders configuration for an index.
- **Parameters**:
  - `indexUid` (string, required): Unique identifier of the index.

#### vector-search

- **Description**: Perform a vector search in a Meilisearch index.
- **Parameters**:
  - `indexUid` (string, required): Unique identifier of the index.
  - `vector` (string, required): JSON array representing the vector to search for.
  - `limit` (number, optional): Maximum number of results to return (default: 20).
  - `offset` (number, optional): Number of results to skip (default: 0).
  - `filter` (string, optional): Filter to apply (e.g., 'genre = horror AND year > 2020').
  - `embedder` (string, optional): Name of the embedder to use (if omitted, a 'vector' must be provided).
  - `attributes` (string[], optional): Attributes to include in the vector search.
  - `query` (string, optional): Text query to search for (if using 'embedder' instead of 'vector').
  - `hybrid` (boolean, optional): Whether to perform a hybrid search (combining vector and text search).
  - `hybridRatio` (number, optional): Ratio of vector vs text search in hybrid search (0-1, default: 0.5).
