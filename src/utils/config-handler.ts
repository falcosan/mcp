/**
 * Configuration service to store and retrieve Meilisearch configuration
 */
class ConfigHandler {
  private _meilisearchHost = "";
  private _meilisearchApiKey = "";

  /**
   * Set the Meilisearch host URL
   * @param host The URL of the Meilisearch instance
   */
  setMeilisearchHost(host: string): void {
    this._meilisearchHost = host;
  }

  /**
   * Set the Meilisearch API key
   * @param apiKey The API key for Meilisearch
   */
  setMeilisearchApiKey(apiKey: string): void {
    this._meilisearchApiKey = apiKey || "";
  }

  /**
   * Get the current Meilisearch host URL
   * @returns The URL of the Meilisearch instance
   */
  getMeilisearchHost(): string {
    return this._meilisearchHost;
  }

  /**
   * Get the current Meilisearch API key
   * @returns The API key for Meilisearch
   */
  getMeilisearchApiKey(): string {
    return this._meilisearchApiKey;
  }
}

export const configHandler = new ConfigHandler();

export default configHandler;
