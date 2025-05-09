import { configService } from "./config-service.js";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

/**
 * Meilisearch API client
 *
 * This module provides a configured Axios instance for making requests to the Meilisearch API.
 * Uses request interceptors to dynamically update host and API key from the configService.
 */

/**
 * Creates a configured Axios instance for Meilisearch API requests
 *
 * @returns An Axios instance with base configuration
 */
export const createApiClient = () => {
  const instance = axios.create({
    headers: { "Content-Type": "application/json" },
  });

  instance.interceptors.request.use((config) => {
    config.baseURL = configService.getMeilisearchHost();
    config.headers.Authorization = `Bearer ${configService.getMeilisearchApiKey()}`;

    return config;
  });

  return {
    get: <T = any>(
      url: string,
      config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> => instance.get(url, config),
    post: <T = any>(
      url: string,
      data?: any,
      config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> => instance.post(url, data, config),
    put: <T = any>(
      url: string,
      data?: any,
      config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> => instance.put(url, data, config),
    patch: <T = any>(
      url: string,
      data?: any,
      config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> => instance.patch(url, data, config),
    delete: <T = any>(
      url: string,
      config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> => instance.delete(url, config),
  };
};

export const apiClient = createApiClient();

export default apiClient;
