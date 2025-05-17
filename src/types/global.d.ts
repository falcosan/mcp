/**
 * Global type declarations for external modules
 */

declare module "../prompts/*.js" {
  const prompt: string;
  export default prompt;
}

declare module "@modelcontextprotocol/sdk/server/mcp.js" {
  import { ZodObject } from "zod";
  import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

  export class McpServer {
    constructor(options?: { name?: string; version?: string });

    _registeredTools: {
      [key: string]: {
        parameters: object;
        description: string;
        inputSchema: ZodObject;
      };
    };

    tool(
      name: string,
      description: string,
      parameters: Record<string, any>,
      handler: (args: any, extra: any) => any | Promise<any>,
      annotations: ToolAnnotations & { category: string }
    ): void;

    connect(transport: any): Promise<void>;
  }
}
