/**
 * Configuration service to store and retrieve Meilisearch configuration
 */
class ConfigHandler {
  private _aiProviderName = "";
  private _meilisearchHost = "";
  private _aiProviderApiKey = "";
  private _meilisearchApiKey = "";
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
  setMeilisearchApiKey(apiKey?: string): void {
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
   * Set the provider for AI inference
   * @param provider The provider name (e.g., openai, huggingface)
   */
  setAiProviderName(provider?: string): void {
    this._aiProviderName = provider || "openai";
  }

  /**
   * Get the current provider for AI inference
   * @returns The provider name
   */
  getAiProviderName(): string {
    return this._aiProviderName;
  }

  /**
   * Set the provider API key
   * @param apiKey The API key for provider
   */
  setAiProviderApiKey(apiKey?: string): void {
    this._aiProviderApiKey = apiKey || "";
  }

  /**
   * Get the current provider API key
   * @returns The API key for provider
   */
  getAiProviderApiKey(): string {
    return this._aiProviderApiKey;
  }

  /**
   * Set the AI model to use
   * @param model The model name (e.g., gpt-3.5-turbo, gpt-4)
   */
  setLlmModel(model?: string): void {
    this._llmModel = model || "gpt-3.5-turbo";
  }

  /**
   * Get the current AI model
   * @returns The model name
   */
  getLlmModel(): string {
    return this._llmModel;
  }
}

export const configHandler = new ConfigHandler();

export default configHandler;
