#!/bin/bash

set -e

find_root_dir() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.git" || -f "$dir/api" ]]; then
      echo "$dir"
      return
    fi
    dir="${dir%/*}"
  done
  echo "$PWD"
}

DIR=${1:-.}
API_DIR="$DIR/api"
MCP_DIR="$API_DIR/mcp"
ENV_FILE="$(find_root_dir)/.env"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$MCP_DIR"

cp "$SCRIPT_DIR/template/host.json" "$API_DIR/host.json"
cp "$SCRIPT_DIR/template/function.json" "$MCP_DIR/function.json"
cp "$SCRIPT_DIR/template/local.settings.json" "$API_DIR/local.settings.json"

if [[ -f "$ENV_FILE" ]]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
else
  echo "Error: Environment file $ENV_FILE not found"
  exit 1
fi

cat > "$API_DIR/local.settings.json" << EOF
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "MEILISEARCH_HOST": "${VITE_MEILISEARCH_HOST}",
    "MEILISEARCH_API_KEY": "${VITE_MEILISEARCH_API_KEY}",
    "ALLOWED_ORIGINS": "*",
    "SESSION_TIMEOUT": "3600000"
  }
}
EOF

if [[ -d "$DIR/dist" ]]; then
  SOURCE_DIR="$DIR/dist"
elif [[ -d "$DIR/node_modules/mcp-meilisearch/dist" ]]; then
  SOURCE_DIR="$DIR/node_modules/mcp-meilisearch/dist"
else
  echo "Error: Could not find source directory"
  exit 1
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
