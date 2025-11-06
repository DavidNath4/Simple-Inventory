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

// Reporting types
export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  category?: string;
  location?: string;
  itemId?: string;
}

export interface InventoryReport {
  summary: {
    totalItems: number;
    totalValue: number;
    lowStockItems: number;
    categories: number;
    locations: number;
  };
  items: Array<{
    id: string;
    name: string;
    sku: string;
    category: string;
    location: string;
    stockLevel: number;
    minStock: number;
    unitPrice: number;
    totalValue: number;
    status: 'normal' | 'low_stock' | 'out_of_stock';
  }>;
  actions: Array<{
    id: string;
    type: ActionType;
    quantity: number;
    itemName: string;
    itemSku: string;
    userName: string;
    createdAt: Date;
  }>;
}

export interface InventoryMetrics {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  topCategories: Array<{
    category: string;
    itemCount: number;
    totalValue: number;
  }>;
  topLocations: Array<{
    location: string;
    itemCount: number;
    totalValue: number;
  }>;
  recentActions: Array<{
    date: string;
    actionCount: number;
    actionsByType: Record<ActionType, number>;
  }>;
  stockTrends: Array<{
    date: string;
    totalStock: number;
    stockIn: number;
    stockOut: number;
  }>;
}

export interface DashboardMetrics {
  overview: {
    totalItems: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalCategories: number;
    totalLocations: number;
  };
  alerts: {
    criticalAlerts: number;
    warningAlerts: number;
    recentAlerts: Array<{
      id: string;
      itemName: string;
      itemSku: string;
      currentStock: number;
      minStock: number;
      severity: 'critical' | 'warning';
      createdAt: Date;
    }>;
  };
  performance: {
    stockTurnover: number;
    averageStockLevel: number;
    stockAccuracy: number;
    topMovingItems: Array<{
      id: string;
      name: string;
      sku: string;
      totalMovements: number;
      netMovement: number;
    }>;
  };
  trends: {
    stockMovements: Array<{
      date: string;
      stockIn: number;
      stockOut: number;
      netChange: number;
    }>;
    valueChanges: Array<{
      date: string;
      totalValue: number;
      valueChange: number;
    }>;
  };
}

export type ExportFormat = 'csv' | 'json' | 'pdf';