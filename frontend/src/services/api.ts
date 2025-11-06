import { ApiResponse, ApiError } from '../types';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Error types for better error handling
export class ApiServiceError extends Error {
  public code: string;
  public status?: number;
  public details?: any;

  constructor(message: string, code: string, status?: number, details?: any) {
    super(message);
    this.name = 'ApiServiceError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class NetworkError extends ApiServiceError {
  constructor(message: string = 'Network connection failed') {
    super(message, 'NETWORK_ERROR');
  }
}

export class AuthenticationError extends ApiServiceError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends ApiServiceError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class ValidationError extends ApiServiceError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class ServerError extends ApiServiceError {
  constructor(message: string = 'Internal server error') {
    super(message, 'SERVER_ERROR', 500);
  }
}

// Loading state management
interface LoadingState {
  [key: string]: boolean;
}

// Request configuration
interface RequestConfig extends RequestInit {
  skipAuth?: boolean;
  skipErrorHandling?: boolean;
  retries?: number;
  timeout?: number;
}

class ApiService {
  private baseURL: string;
  private token: string | null = null;
  private loadingStates: LoadingState = {};
  private requestInterceptors: Array<(config: RequestConfig) => RequestConfig> = [];
  private responseInterceptors: Array<(response: Response) => Response | Promise<Response>> = [];
  private errorHandlers: Array<(error: ApiServiceError) => void> = [];

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
    this.setupDefaultInterceptors();
  }

  private setupDefaultInterceptors() {
    // Add default error handling
    this.addErrorHandler((error: ApiServiceError) => {
      console.error('API Error:', error);
      
      // Handle authentication errors
      if (error instanceof AuthenticationError) {
        this.setToken(null);
        // Redirect to login if needed
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    });
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  // Interceptor management
  addRequestInterceptor(interceptor: (config: RequestConfig) => RequestConfig) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: (response: Response) => Response | Promise<Response>) {
    this.responseInterceptors.push(interceptor);
  }

  addErrorHandler(handler: (error: ApiServiceError) => void) {
    this.errorHandlers.push(handler);
  }

  // Loading state management
  setLoading(key: string, loading: boolean) {
    this.loadingStates[key] = loading;
  }

  isLoading(key: string): boolean {
    return this.loadingStates[key] || false;
  }

  getAllLoadingStates(): LoadingState {
    return { ...this.loadingStates };
  }

  // Network status check
  private async checkNetworkStatus(): Promise<boolean> {
    if (!navigator.onLine) {
      return false;
    }
    
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'HEAD',
        cache: 'no-cache',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestConfig = {}
  ): Promise<T> {
    const loadingKey = `${options.method || 'GET'}_${endpoint}`;
    
    try {
      // Set loading state
      this.setLoading(loadingKey, true);

      // Check network status
      if (!(await this.checkNetworkStatus())) {
        throw new NetworkError('No network connection available');
      }

      // Apply request interceptors
      let config = { ...options };
      for (const interceptor of this.requestInterceptors) {
        config = interceptor(config);
      }

      const url = `${this.baseURL}${endpoint}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(config.headers as Record<string, string>),
      };

      // Add auth header if token exists and not skipped
      if (this.token && !config.skipAuth) {
        headers.Authorization = `Bearer ${this.token}`;
      }

      const requestConfig: RequestInit = {
        ...config,
        headers,
      };

      // Set up timeout
      const timeout = config.timeout || 30000; // 30 seconds default
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      requestConfig.signal = controller.signal;

      let response: Response;
      const maxRetries = config.retries || 0;
      let lastError: Error | null = null;

      // Retry logic
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          response = await fetch(url, requestConfig);
          clearTimeout(timeoutId);

          // Apply response interceptors
          for (const interceptor of this.responseInterceptors) {
            response = await interceptor(response);
          }

          break; // Success, exit retry loop
        } catch (error) {
          lastError = error as Error;
          
          // Don't retry on the last attempt
          if (attempt === maxRetries) {
            throw error;
          }

          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }

      if (!response!) {
        throw lastError || new Error('Request failed after retries');
      }

      // Handle different response types
      let data: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else if (contentType?.includes('text/')) {
        data = await response.text();
      } else {
        data = await response.blob();
      }

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = typeof data === 'object' ? data : { message: data };
        const errorMessage = errorData.error?.message || errorData.message || 'Request failed';
        
        switch (response.status) {
          case 400:
            throw new ValidationError(errorMessage, errorData.error?.details);
          case 401:
            throw new AuthenticationError(errorMessage);
          case 403:
            throw new AuthorizationError(errorMessage);
          case 404:
            throw new ApiServiceError(errorMessage, 'NOT_FOUND', 404);
          case 409:
            throw new ApiServiceError(errorMessage, 'CONFLICT', 409);
          case 422:
            throw new ValidationError(errorMessage, errorData.error?.details);
          case 429:
            throw new ApiServiceError('Too many requests', 'RATE_LIMIT', 429);
          case 500:
          case 502:
          case 503:
          case 504:
            throw new ServerError(errorMessage);
          default:
            throw new ApiServiceError(errorMessage, 'UNKNOWN_ERROR', response.status);
        }
      }

      return data;
    } catch (error) {
      // Handle different error types
      if (error instanceof ApiServiceError) {
        // Call error handlers
        if (!options.skipErrorHandling) {
          this.errorHandlers.forEach(handler => handler(error));
        }
        throw error;
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError = new NetworkError('Network request failed');
        if (!options.skipErrorHandling) {
          this.errorHandlers.forEach(handler => handler(networkError));
        }
        throw networkError;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new ApiServiceError('Request timeout', 'TIMEOUT');
        if (!options.skipErrorHandling) {
          this.errorHandlers.forEach(handler => handler(timeoutError));
        }
        throw timeoutError;
      }

      // Unknown error
      const unknownError = new ApiServiceError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        'UNKNOWN_ERROR'
      );
      if (!options.skipErrorHandling) {
        this.errorHandlers.forEach(handler => handler(unknownError));
      }
      throw unknownError;
    } finally {
      // Clear loading state
      this.setLoading(loadingKey, false);
    }
  }

  // HTTP method helpers with enhanced options
  async get<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  async patch<T>(endpoint: string, data?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Health check
  async healthCheck(): Promise<
    ApiResponse<{ status: string; message: string }>
  > {
    return this.get<ApiResponse<{ status: string; message: string }>>(
      '/health'
    );
  }

  // Authentication methods
  async login(credentials: { email: string; password: string }) {
    try {
      const response = await this.post<any>('/auth/login', credentials, { 
        skipAuth: true,
        retries: 1 
      });
      if (response.token) {
        this.setToken(response.token);
      }
      return response;
    } catch (error) {
      if (error instanceof ApiServiceError) {
        throw error;
      }
      throw new AuthenticationError('Login failed');
    }
  }

  async logout() {
    try {
      const response = await this.post<any>('/auth/logout', undefined, { 
        skipErrorHandling: true 
      });
      return response;
    } catch (error) {
      // Always clear token on logout, even if request fails
      console.warn('Logout request failed, but clearing local session');
    } finally {
      this.setToken(null);
    }
  }

  async refreshToken() {
    try {
      const response = await this.post<any>('/auth/refresh', undefined, {
        retries: 1
      });
      if (response.token) {
        this.setToken(response.token);
      }
      return response;
    } catch (error) {
      this.setToken(null);
      throw error;
    }
  }

  // Inventory methods
  async getInventoryItems(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    location?: string;
    lowStock?: boolean;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    const query = queryParams.toString();
    return this.get(`/inventory${query ? `?${query}` : ''}`);
  }

  async getInventoryItem(id: string) {
    return this.get(`/inventory/${id}`);
  }

  async createInventoryItem(data: any) {
    return this.post('/inventory', data);
  }

  async updateInventoryItem(id: string, data: any) {
    return this.put(`/inventory/${id}`, data);
  }

  async deleteInventoryItem(id: string) {
    return this.delete(`/inventory/${id}`);
  }

  async getCategories() {
    return this.get('/inventory/categories');
  }

  async getLocations() {
    return this.get('/inventory/locations');
  }

  async getLowStockItems() {
    return this.get('/inventory/low-stock');
  }

  async updateStock(
    id: string,
    data: { quantity: number; type: string; notes?: string }
  ) {
    return this.post(`/inventory/${id}/stock`, data);
  }

  async adjustStock(id: string, data: { stockLevel: number; notes?: string }) {
    return this.post(`/inventory/${id}/adjust`, data);
  }

  async getInventoryActions(
    id: string,
    params?: { page?: number; limit?: number }
  ) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const query = queryParams.toString();
    return this.get(`/inventory/${id}/actions${query ? `?${query}` : ''}`);
  }

  async bulkUpdateItems(updates: any[]) {
    return this.post('/inventory/bulk/update', { updates });
  }

  async bulkUpdateStock(updates: any[]) {
    return this.post('/inventory/bulk/stock', { updates });
  }

  async bulkCreateItems(items: any[]) {
    return this.post('/inventory/bulk/create', { items });
  }

  async bulkDeleteItems(ids: string[]) {
    return this.post('/inventory/bulk/delete', { ids });
  }

  // Admin methods
  async getAdminDashboard() {
    return this.get('/admin/dashboard');
  }

  async getUsers() {
    return this.get('/admin/users');
  }

  async createUser(userData: {
    name: string;
    email: string;
    password: string;
    role: string;
  }) {
    return this.post('/admin/users', userData);
  }

  async updateUser(id: string, userData: any) {
    return this.put(`/admin/users/${id}`, userData);
  }

  async activateUser(id: string) {
    return this.patch(`/admin/users/${id}/activate`, {});
  }

  async deactivateUser(id: string) {
    return this.patch(`/admin/users/${id}/deactivate`, {});
  }

  async deleteUser(id: string) {
    return this.delete(`/admin/users/${id}`);
  }

  // Reporting methods
  async getDashboardMetrics(filter?: {
    startDate?: string;
    endDate?: string;
    category?: string;
    location?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    const query = queryParams.toString();
    return this.get(`/reports/dashboard${query ? `?${query}` : ''}`);
  }

  async getInventoryReport(filter?: {
    startDate?: string;
    endDate?: string;
    category?: string;
    location?: string;
    itemId?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    const query = queryParams.toString();
    return this.get(`/reports/inventory${query ? `?${query}` : ''}`);
  }

  async getInventoryMetrics(filter?: {
    startDate?: string;
    endDate?: string;
    category?: string;
    location?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    const query = queryParams.toString();
    return this.get(`/reports/metrics${query ? `?${query}` : ''}`);
  }

  async exportInventoryReport(
    format: 'csv' | 'json' | 'pdf',
    filter?: {
      startDate?: string;
      endDate?: string;
      category?: string;
      location?: string;
      itemId?: string;
    }
  ) {
    const queryParams = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    const query = queryParams.toString();
    const endpoint = `/reports/export/${format}${query ? `?${query}` : ''}`;

    try {
      // Use the enhanced request method for file downloads
      const blob = await this.request<Blob>(endpoint, {
        method: 'GET',
        headers: {
          'Accept': this.getAcceptHeader(format),
        },
        retries: 1,
      });

      return blob;
    } catch (error) {
      if (error instanceof ApiServiceError) {
        throw new ApiServiceError(
          `Failed to export ${format.toUpperCase()} report: ${error.message}`,
          'EXPORT_ERROR',
          error.status
        );
      }
      throw error;
    }
  }

  private getAcceptHeader(format: string): string {
    switch (format) {
      case 'csv':
        return 'text/csv';
      case 'json':
        return 'application/json';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }

  // Alert methods
  async getAlerts() {
    return this.get('/inventory/alerts');
  }

  async getAlertStatistics() {
    return this.get('/inventory/alerts/statistics');
  }

  async triggerAlertCheck() {
    return this.post('/inventory/alerts/check');
  }

  async monitorStockLevels() {
    return this.get('/inventory/monitor');
  }
}

export const apiService = new ApiService();
export default apiService;
