#!/bin/bash

TARGET_DIR=${1:-.}

mkdir -p "$TARGET_DIR/api/mcp"

cp "$(dirname "$0")/../template/host.json" "$TARGET_DIR/api/host.json"
cp "$(dirname "$0")/../template/function.json" "$TARGET_DIR/api/mcp/function.json"
cp "$(dirname "$0")/../template/local.settings.json" "$TARGET_DIR/api/local.settings.json"

if [ -d "$(dirname "$0")/../dist" ]; then
  SOURCE_DIR="$(dirname "$0")/../dist"
elif [ -d "node_modules/mcp-meilisearch/dist" ]; then
  SOURCE_DIR="node_modules/mcp-meilisearch/dist"
else
  echo "Error: Could not find the dist directory. Run this script from your project root or the package directory."
  exit 1
fi

cp "$SOURCE_DIR/azure.js" "$TARGET_DIR/api/"
cp "$SOURCE_DIR/server.js" "$TARGET_DIR/api/"
cp -r "$SOURCE_DIR/utils" "$TARGET_DIR/api/"
cp -r "$SOURCE_DIR/types" "$TARGET_DIR/api/"
cp -r "$SOURCE_DIR/tools" "$TARGET_DIR/api/"

cat > "$TARGET_DIR/api/package.json" << EOF
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

echo "Your MCP API will be available at: https://your-static-web-app-url/api/mcp"
