#!/bin/bash

set -e

TARGET_DIR=${1:-.}
SCRIPT_DIR="$(dirname "$0")"
API_DIR="$TARGET_DIR/api"
MCP_DIR="$API_DIR/mcp"

mkdir -p "$MCP_DIR"

cp "$SCRIPT_DIR/template/host.json" "$API_DIR/host.json"
cp "$SCRIPT_DIR/template/function.json" "$MCP_DIR/function.json"
cp "$SCRIPT_DIR/template/local.settings.json" "$API_DIR/local.settings.json"

if [ -d "$TARGET_DIR/dist" ]; then
  SOURCE_DIR="$TARGET_DIR/dist"
else [ -d "$TARGET_DIR/node_modules/mcp-meilisearch/dist" ];
  SOURCE_DIR="$TARGET_DIR/node_modules/mcp-meilisearch/dist"
fi

cp -r "$SOURCE_DIR/azure" "$API_DIR/"
cp -r "$SOURCE_DIR/utils" "$API_DIR/"
cp -r "$SOURCE_DIR/types" "$API_DIR/"
cp -r "$SOURCE_DIR/tools" "$API_DIR/"
cp "$SOURCE_DIR/server.js" "$API_DIR/"

cat > "$API_DIR/package.json" << EOF
{
  "name": "mcp-meilisearch-function",
  "version": "1.0.0",
  "description": "mcp-meilisearch-function",
  "type": "module",
  "dependencies": {
    "@azure/functions": "^3.5.1",
    "@modelcontextprotocol/sdk": "^1.10.1",
    "axios": "^1.9.0",
    "zod": "^3.24.4"
  }
}
EOF
