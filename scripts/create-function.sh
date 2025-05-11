#!/bin/bash

# Script to create an Azure Function deployment for MCP Meilisearch

# Get target directory from first argument or use current directory
TARGET_DIR=${1:-.}

# Create the function directory structure
mkdir -p "$TARGET_DIR/api"
mkdir -p "$TARGET_DIR/api/mcp"

# Copy host.json to api directory
cp "$(dirname "$0")/../template/host.json" "$TARGET_DIR/api/host.json"
echo "✓ Created host.json configuration"

# Copy function.json to api/mcp directory
cp "$(dirname "$0")/../template/function.json" "$TARGET_DIR/api/mcp/function.json"
echo "✓ Created function.json configuration"

# Copy local.settings.json if it doesn't exist
cp "$(dirname "$0")/../template/local.settings.json" "$TARGET_DIR/api/local.settings.json"
echo "✓ Created local.settings.json for local development"

# Check if the current directory is the package directory or a project that installed the package
if [ -d "$(dirname "$0")/../dist" ]; then
  # We're in the package directory
  SOURCE_DIR="$(dirname "$0")/../dist"
elif [ -d "node_modules/mcp-meilisearch/dist" ]; then
  # We're in a project that installed the package
  SOURCE_DIR="node_modules/mcp-meilisearch/dist"
else
  echo "❌ Error: Could not find the dist directory. Run this script from your project root or the package directory."
  exit 1
fi

# Copy the necessary files to the API directory
cp "$SOURCE_DIR/azure.js" "$TARGET_DIR/api/"
cp "$SOURCE_DIR/server.js" "$TARGET_DIR/api/"
cp -r "$SOURCE_DIR/utils" "$TARGET_DIR/api/"
cp -r "$SOURCE_DIR/types" "$TARGET_DIR/api/"
cp -r "$SOURCE_DIR/tools" "$TARGET_DIR/api/"
echo "✓ Copied MCP server files to API directory"

# Create package.json for the API
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

echo ""
echo "✅ Azure Function deployment files created successfully in $TARGET_DIR/api"
echo ""
echo "Your MCP API will be available at: https://your-static-web-app-url/api/mcp"
