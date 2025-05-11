#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

console.log("Starting Azure Function local development server...");

try {
  execSync("func --version", { stdio: "ignore" });
} catch (error) {
  console.error("Azure Function Core Tools is not installed.");
  console.log(
    "Please install it with: npm install -g azure-functions-core-tools@4"
  );
  process.exit(1);
}

const targetDir = process.argv[2] || ".";
const apiDir = path.resolve(targetDir, "api");

if (!fs.existsSync(apiDir)) {
  console.error(`Error: API directory not found at ${apiDir}`);
  console.log(
    "Run the create-function.sh script first to set up the Azure Function."
  );
  process.exit(1);
}

try {
  console.log(`Starting Azure Functions Core Tools in ${apiDir}`);
  execSync(`cd "${apiDir}" && func start`, { stdio: "inherit" });
} catch (error) {
  console.error("Error running Azure Functions Core Tools:", error);
  process.exit(1);
}
