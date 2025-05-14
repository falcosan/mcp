/**
 * Configuration service to store and retrieve Meilisearch configuration
 */
class ConfigHandler {
  private _meilisearchHost = "";
  private _meilisearchApiKey = "";
  private _openaiApiKey = "";
  private _llmModel = "gpt-3.5-turbo";

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

  /**
   * Set the OpenAI API key
   * @param apiKey The API key for OpenAI
   */
  setOpenaiApiKey(apiKey: string): void {
    this._openaiApiKey = apiKey || "";
  }

  /**
   * Get the current OpenAI API key
   * @returns The API key for OpenAI
   */
  getOpenaiApiKey(): string {
    return this._openaiApiKey;
  }

  /**
   * Set the LLM model to use
   * @param model The model name (e.g., gpt-3.5-turbo, gpt-4)
   */
  setLlmModel(model: string): void {
    this._llmModel = model || "gpt-3.5-turbo";
  }

  /**
   * Get the current LLM model
   * @returns The model name
   */
  getLlmModel(): string {
    return this._llmModel;
  }
}

export const configHandler = new ConfigHandler();

export default configHandler;
