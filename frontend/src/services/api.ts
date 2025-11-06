import { ApiResponse } from '../types';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
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
    const response = await this.post<any>('/auth/login', credentials);
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async logout() {
    this.setToken(null);
    return this.post<any>('/auth/logout');
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
}

export const apiService = new ApiService();
export default apiService;
