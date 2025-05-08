# MCP Meilisearch API Server

A Model Context Protocol (MCP) server implementation that provides a bridge between AI models and the Meilisearch search engine using the StreamableHTTP transport. This project enables seamless integration of Meilisearch's powerful search capabilities within AI workflows.

## Updated Overview

This project provides a MCP server that enables AI models to interact directly with Meilisearch functionalities. The architecture includes:

- **MCP Server**: Exposes Meilisearch APIs as tools using the Model Context Protocol.
- **Web Client**: A demo interface showcasing search functionalities.

## Architecture

```
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  Meilisearch  │      │   MCP Server  │      │   Web Client  │
│   Instance    │ <--> │   (Node.js)   │ <--> │   (Browser)   │
└───────────────┘      └───────────────┘      └───────────────┘
        ^
        │
┌───────────────┐
│ Document Data │
│    Sources    │
└───────────────┘
```

## Key Features

- **StreamableHTTP Transport**: Real-time communication between clients and the server.
- **Meilisearch API Support**: Full access to Meilisearch functionalities.
- **Enhanced Error Handling**: Improved error management for API requests.
- **Web Client Demo**: Updated interface for demonstrating search capabilities.

## Tool Categories

The MCP server organizes Meilisearch APIs into these categories:

1. **System Tools**: Health checks, version info, server stats.
2. **Index Tools**: Manage indexes (create, update, delete, list).
3. **Document Tools**: Add, update, delete, and retrieve documents.
4. **Search Tools**: Advanced search, including vector search.
5. **Settings Tools**: Configure index settings.
6. **Task Tools**: Manage asynchronous tasks.
7. **Vector Tools**: Experimental vector search capabilities.

## Getting Started

### Prerequisites

- Node.js v20 or higher.
- A running Meilisearch instance (local or remote).
- API key for Meilisearch (if required).

### Setup Instructions

1. Clone the repository:

```bash
git clone <repository-url>
```

2. Install dependencies:

```bash
npm install
```

3. Configure the environment:

Create a `.env` file with the following content:

```
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your_master_key_here
```

### Running the Server

To start the server:

```bash
npm run start:server  # Start the MCP server
npm run start:client  # Start the web client
```

### Accessing the Web Interface

Visit the following URL in your browser:

```
http://localhost:8000
```

## Development

This project uses:

- **TypeScript**: Ensures type safety.
- **Express**: Powers the web server.
- **Model Context Protocol SDK**: Facilitates AI integration.

## Project Structure

- `src/`: Core MCP server implementation.
  - `tools/`: Meilisearch API tools.
  - `utils/`: Utility functions for API communication and error handling.
  - `server.ts`: Main MCP server implementation.
- `client/`: Web client for testing and demonstration.
