#!/bin/bash

set -e

FUNC_CMD="func"
if ! command -v "${FUNC_CMD}" &>/dev/null; then
  echo "Azure Function Core Tools is not installed."
  echo "Please install it with: npm install -g azure-functions-core-tools@4"
  exit 1
fi

TARGET_DIR="${1:-.}"
API_DIR="$(realpath "${TARGET_DIR}/api" 2>/dev/null || readlink -f "${TARGET_DIR}/api" 2>/dev/null || echo "${TARGET_DIR}/api")"

if [ ! -d "${API_DIR}" ]; then
  echo "Error: API directory not found at ${API_DIR}"
  echo "Run the 0.sh script first to set up the Azure Function."
  exit 2
fi

cd "${API_DIR}" || exit 3
${FUNC_CMD} start
