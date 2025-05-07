/**
 * Meilisearch MCP Server Configuration
 *
 * This file contains the configuration settings for connecting to the Meilisearch server.
 * Configuration is loaded from environment variables with sensible defaults.
 */

// Server configuration interface
export interface ServerConfig {
  /** The URL of the Meilisearch instance */
  host: string;
  /** The API key for authenticating with Meilisearch */
  apiKey: string;
  /** The timeout for API requests in milliseconds */
  timeout: number;
}

/**
 * Load and initialize configuration from environment variables
 */
export const loadConfig = (): ServerConfig => {
  return {
    host: "https://babilonia.penumbracosmica.earth",
    apiKey: "b42f7058-e00a-4c2b-9d03-7b0b68f694e5",
    timeout: 10000,
  };
};

// Export the config instance
export const config = loadConfig();

// Re-export for direct use
export default config;
