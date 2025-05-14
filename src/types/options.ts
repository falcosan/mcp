export interface ServerOptions {
  /**
   * The URL of the Meilisearch instance
   * @required
   * @example "http://localhost:7700"
   */
  meilisearchHost: string;

  /**
   * The API key for authenticating with Meilisearch
   * @required
   */
  meilisearchApiKey: string;
  /**
   * Transport type for MCP server ("http" | "stdio")
   * @default "http"
   */
  transport?: "http" | "stdio";

  /**
   * HTTP port for MCP server
   * @default 4995
   */
  httpPort?: number;

  /**
   * MCP endpoint path
   * @default "/mcp"
   */
  mcpEndpoint?: string;

  /**
   * Session timeout in milliseconds
   * @default 3600000 (1 hour)
   */
  sessionTimeout?: number;

  /**
   * Session cleanup interval in milliseconds
   * @default 60000 (1 minute)
   */
  sessionCleanupInterval?: number;

  /**
   * OpenAI API key for LLM inference
   */
  openaiApiKey?: string;

  /**
   * LLM model to use for inference
   * @default "gpt-3.5-turbo"
   */
  llmModel?: string;
}
