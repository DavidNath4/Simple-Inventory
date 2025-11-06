// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

// Inventory types
export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  sku: string;
  category: string;
  stockLevel: number;
  minStock: number;
  maxStock?: number;
  unitPrice: number;
  location: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryAction {
  id: string;
  type: ActionType;
  quantity: number;
  notes?: string;
  createdAt: string;
  userId: string;
  itemId: string;
  user?: User;
  item?: InventoryItem;
}

export enum ActionType {
  ADD_STOCK = 'ADD_STOCK',
  REMOVE_STOCK = 'REMOVE_STOCK',
  ADJUST_STOCK = 'ADJUST_STOCK',
  TRANSFER = 'TRANSFER',
}

// API types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
