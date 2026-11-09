import axios, { AxiosInstance, AxiosError } from 'axios';
import { AuthResponse, LoginRequest, RegisterRequest, UserProfile } from '@shared/types';

interface ApiClientConfig {
  baseURL: string;
  onTokenRefresh?: (tokens: { access_token: string }) => void;
  onUnauthorized?: () => void;
}

export class ApiClient {
  private client: AxiosInstance;
  private config: ApiClientConfig;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor(config: ApiClientConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      withCredentials: true, // Include cookies for refresh tokens
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor: add access token to headers
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
      if (token && token.length > 0) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor: handle token expiry and refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Only refresh on 401 if we sent an auth header and haven't already tried
        const hadAuthHeader = originalRequest.headers?.Authorization?.startsWith('Bearer ');
        if (error.response?.status === 401 && !originalRequest._retry && hadAuthHeader) {
          if (this.isRefreshing) {
            // Wait for token refresh to complete
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.client(originalRequest));
              });
            });
          }

          this.isRefreshing = true;
          originalRequest._retry = true;

          try {
            const response = await this.client.post<{ data: { access_token: string } }>(
              '/api/auth/refresh'
            );
            const newToken = response.data.data.access_token;
            localStorage.setItem('access_token', newToken);

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;

            // Notify waiting requests
            this.refreshSubscribers.forEach((cb) => cb(newToken));
            this.refreshSubscribers = [];

            this.config.onTokenRefresh?.({ access_token: newToken });

            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, user needs to log in again
            localStorage.removeItem('access_token');
            this.config.onUnauthorized?.();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(data: RegisterRequest) {
    const response = await this.client.post<{ data: AuthResponse }>('/api/auth/register', data);
    const { access_token } = response.data.data;
    localStorage.setItem('access_token', access_token);
    return response.data.data;
  }

  async login(data: LoginRequest) {
    const response = await this.client.post<{ data: AuthResponse }>('/api/auth/login', data);
    const { access_token } = response.data.data;
    localStorage.setItem('access_token', access_token);
    return response.data.data;
  }

  async logout() {
    try {
      await this.client.post('/api/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
    }
  }

  async deleteAccount(password: string) {
    await this.client.delete('/api/auth/me', { data: { password } });
    localStorage.removeItem('access_token');
  }

  async getCurrentUser(): Promise<UserProfile> {
    const response = await this.client.get<{ data: UserProfile }>('/api/auth/me');
    return response.data.data;
  }

  async getPhotoPdf(params: URLSearchParams): Promise<{ blob: Blob; filename: string }> {
    const response = await this.client.get<Blob>('/api/photos/print', { params, responseType: 'blob' });
    const disposition = response.headers['content-disposition'] as string | undefined;
    const filename = disposition?.match(/filename="([^"]+)"/)?.[1]
      || `Lens_Flare_photos__${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
    return { blob: response.data, filename };
  }

  // Generic request methods
  async get<T>(url: string, config = {}) {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config = {}) {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config = {}) {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config = {}) {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

// Create and export singleton instance
const apiClient = new ApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL as string || 'http://localhost:3000',
  onUnauthorized: () => {
    // Redirect to login or emit event
    window.location.href = '/login';
  },
});

export default apiClient;
