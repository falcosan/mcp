export type AiProviderNameOptions = "openai" | "huggingface" | "openrouter";

export interface ServerOptions {
  /**
   * The URL of the Meilisearch instance
   * @default "http://localhost:7700"
   */
  meilisearchHost?: string;

  /**
   * The API key for authenticating with Meilisearch
   */
  meilisearchApiKey?: string;
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
   * AI inference provider name
   * @default "openai"
   */
  aiProviderName?: AiProviderNameOptions;

  /**
   * AI provider API key for AI inference
   */
  aiProviderApiKey?: string;

  /**
   * AI model to use for inference
   * @default "gpt-3.5-turbo"
   */
  llmModel?: string;
}
