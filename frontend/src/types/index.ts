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

// Pagination types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Filter types
export interface InventoryFilter {
  search?: string;
  category?: string;
  location?: string;
  lowStock?: boolean;
}

// Request types for inventory operations
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

export interface StockUpdateRequest {
  quantity: number;
  type: ActionType;
  notes?: string;
}

export interface StockAdjustRequest {
  stockLevel: number;
  notes?: string;
}

// Bulk operation types
export interface BulkUpdateItem {
  id: string;
  name?: string;
  category?: string;
  location?: string;
  minStock?: number;
  maxStock?: number;
  unitPrice?: number;
}

export interface BulkStockUpdate {
  id: string;
  stockLevel: number;
  type?: ActionType;
  notes?: string;
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
    createdAt: string;
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
      createdAt: string;
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

// Notification types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number; // in milliseconds, 0 means persistent
  createdAt: Date;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

export interface Alert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'system' | 'inventory_update';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  itemId?: string;
  itemName?: string;
  itemSku?: string;
  currentStock?: number;
  minStock?: number;
  location?: string;
  category?: string;
  createdAt: Date;
  acknowledged?: boolean;
  dismissible?: boolean;
}

export interface NotificationContextType {
  notifications: Notification[];
  alerts: Alert[];
  addNotification: (
    notification: Omit<Notification, 'id' | 'createdAt'>
  ) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  addAlert: (alert: Omit<Alert, 'id' | 'createdAt'>) => void;
  removeAlert: (id: string) => void;
  acknowledgeAlert: (id: string) => void;
  clearAlerts: () => void;
}
