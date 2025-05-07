# MCP Meilisearch API Server

A comprehensive Model Context Protocol (MCP) server implementation that provides a bridge between AI models and the Meilisearch search engine using the StreamableHTTP transport. This project enables seamless integration of Meilisearch's powerful search capabilities within AI workflows.

## Project Overview

This project implements an MCP (Model Context Protocol) server that provides AI models with direct access to Meilisearch's functionalities. The implementation follows a client-server architecture with these key components:

- **MCP Server**: Implements the Model Context Protocol to expose Meilisearch APIs as tools
- **Web Client**: Simple demo interface for testing the search functionality
- **Command Line Client**: Utility client for testing and development

## Architecture

```
┌──────────────┐      ┌──────────────┐     ┌───────────────┐
│  Web Client  │      │  MCP Server  │     │  Meilisearch  │
│  (Browser)   │ <--> │   (Node.js)  │ <-> │   Instance    │
└──────────────┘      └──────────────┘     └───────────────┘
       ^                                            ^
       │                                            │
┌──────────────┐                          ┌───────────────┐
│ Command Line │                          │ Document Data │
│    Client    │                          │   Sources     │
└──────────────┘                          └───────────────┘
```

## Key Features

- **StreamableHTTP Transport**: Implements the StreamableHTTP transport for MCP, enabling real-time communication between clients and server
- **Full Meilisearch API Support**: Exposes all Meilisearch functionalities as MCP tools
- **Category-based Organization**: Tools are organized by functional categories
- **Error Handling**: Comprehensive error handling for API requests
- **Web Client Demo**: Simple web interface to demonstrate search capabilities
- **Command Line Client**: For testing and development

## Available Tool Categories

The MCP server exposes Meilisearch APIs organized into these functional categories:

1. **System Tools**: Health checks, version information, server stats
2. **Index Tools**: Managing indexes (create, update, delete, list)
3. **Document Tools**: Document operations (add, update, delete, retrieve)
4. **Search Tools**: Advanced search capabilities including vector search
5. **Settings Tools**: Configuration management for indexes
6. **Task Tools**: Asynchronous task management
7. **Vector Tools**: Vector search capabilities (experimental feature)

## Getting Started

### Prerequisites

- Node.js v20 or higher
- Meilisearch instance running locally or remotely
- API key for Meilisearch (if required by your Meilisearch configuration)

### Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the server directory with your Meilisearch configuration:

```
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your_master_key_here
MEILISEARCH_TIMEOUT=5000
```

### Running the Server

Build and start the server:

```bash
npm run dev:cmd  # For command line testing
# OR
npm run dev:web  # For web interface testing
```

### Accessing the Web Interface

Once running, the web demo is available at:

```
http://localhost:8000
```

## Development

This project uses:

- TypeScript for type safety
- Lerna for workspace management
- Express for the web server
- Model Context Protocol SDK for AI integration

## Project Structure

- `server/`: MCP server implementation
  - `src/tools/`: Implementation of Meilisearch API tools
  - `src/utils/`: Utility functions for API communication and error handling
  - `src/server.ts`: StreamableHTTP MCP server implementation
- `client_web/`: Web demo client
- `client_cmd/`: Command line client for testing
