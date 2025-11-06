import { User, InventoryItem, InventoryAction, AuditLog, UserRole, ActionType } from '@prisma/client';

// Re-export Prisma types
export { User, InventoryItem, InventoryAction, AuditLog, UserRole, ActionType };

// Request/Response DTOs
export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface CreateInventoryItemRequest {
  name: string;
  description?: string;
  sku: string;
  category: string;
  stockLevel?: number;
  minStock?: number;
  maxStock?: number;
  unitPrice: number;
  location: string;
}

export interface UpdateInventoryItemRequest {
  name?: string;
  description?: string;
  category?: string;
  minStock?: number;
  maxStock?: number;
  unitPrice?: number;
  location?: string;
}

export interface CreateInventoryActionRequest {
  type: ActionType;
  quantity: number;
  notes?: string;
  itemId: string;
}

export interface InventoryFilter {
  category?: string;
  location?: string;
  lowStock?: boolean;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

// Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}