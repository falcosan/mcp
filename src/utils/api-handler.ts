import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

/**
 * Meilisearch API client
 *
 * This module provides a singleton Axios instance for making requests to the Meilisearch API
 * with the ability to set the API key and host once.
 */

class ApiClientSingleton {
  private static instance: ReturnType<
    typeof ApiClientSingleton.createApiClientInstance
  > | null = null;
  private static isHostSet = false;
  private static isApiKeySet = false;
  private static currentHost = "";
  private static currentApiKey = "";

  private constructor() {}

  /**
   * Creates an Axios instance with current configuration
   */
  private static createApiClientInstance() {
    const axiosInstance = axios.create({
      baseURL: this.currentHost,
      headers: {
        Authorization: `Bearer ${this.currentApiKey}`,
        "Content-Type": "application/json",
      },
    });

    return {
      get: <T = any>(
        url: string,
        config?: AxiosRequestConfig
      ): Promise<AxiosResponse<T>> => axiosInstance.get(url, config),
      post: <T = any>(
        url: string,
        data?: any,
        config?: AxiosRequestConfig
      ): Promise<AxiosResponse<T>> => axiosInstance.post(url, data, config),
      put: <T = any>(
        url: string,
        data?: any,
        config?: AxiosRequestConfig
      ): Promise<AxiosResponse<T>> => axiosInstance.put(url, data, config),
      patch: <T = any>(
        url: string,
        data?: any,
        config?: AxiosRequestConfig
      ): Promise<AxiosResponse<T>> => axiosInstance.patch(url, data, config),
      delete: <T = any>(
        url: string,
        config?: AxiosRequestConfig
      ): Promise<AxiosResponse<T>> => axiosInstance.delete(url, config),
    };
  }

  /**
   * Set the API key - can only be set once
   */
  public static setApiKey(apiKey: string): boolean {
    if (!this.isApiKeySet) {
      this.currentApiKey = apiKey;
      this.isApiKeySet = true;
      this.instance = this.createApiClientInstance();
      return true;
    }
    return false;
  }

  /**
   * Set the host URL - can only be set once
   */
  public static setHost(host: string): boolean {
    if (!this.isHostSet) {
      this.currentHost = host;
      this.isHostSet = true;
      this.instance = this.createApiClientInstance();
      return true;
    }
    return false;
  }

  /**
   * Get the API client instance, creating it if needed
   */
  public static getInstance() {
    if (!this.instance) this.instance = this.createApiClientInstance();

    return this.instance;
  }
}

export const apiClient = ApiClientSingleton.getInstance();
export const setApiKey = ApiClientSingleton.setApiKey.bind(ApiClientSingleton);
export const setHost = ApiClientSingleton.setHost.bind(ApiClientSingleton);

export default apiClient;
