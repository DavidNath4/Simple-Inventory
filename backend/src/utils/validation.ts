import { UserRole, ActionType } from '@prisma/client';
import { 
  CreateUserRequest, 
  UpdateUserRequest, 
  CreateInventoryItemRequest, 
  UpdateInventoryItemRequest,
  CreateInventoryActionRequest,
  LoginRequest 
} from '../types';

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation
export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

// SKU validation
export const isValidSKU = (sku: string): boolean => {
  const skuRegex = /^[A-Z0-9-_]+$/;
  return sku.length >= 3 && sku.length <= 50 && skuRegex.test(sku);
};

// Price validation
export const isValidPrice = (price: number): boolean => {
  return price >= 0 && Number.isFinite(price);
};

// Stock validation
export const isValidStock = (stock: number): boolean => {
  return Number.isInteger(stock) && stock >= 0;
};

// User validation
export const validateCreateUser = (data: CreateUserRequest): void => {
  if (!data.email || !isValidEmail(data.email)) {
    throw new ValidationError('Valid email is required', 'email');
  }
  
  if (!data.password || !isValidPassword(data.password)) {
    throw new ValidationError('Password must be at least 6 characters long', 'password');
  }
  
  if (!data.name || data.name.trim().length < 2) {
    throw new ValidationError('Name must be at least 2 characters long', 'name');
  }
  
  if (data.role && !Object.values(UserRole).includes(data.role)) {
    throw new ValidationError('Invalid user role', 'role');
  }
};

export const validateUpdateUser = (data: UpdateUserRequest): void => {
  if (data.email && !isValidEmail(data.email)) {
    throw new ValidationError('Valid email is required', 'email');
  }
  
  if (data.name && data.name.trim().length < 2) {
    throw new ValidationError('Name must be at least 2 characters long', 'name');
  }
  
  if (data.role && !Object.values(UserRole).includes(data.role)) {
    throw new ValidationError('Invalid user role', 'role');
  }
};

// Inventory item validation
export const validateCreateInventoryItem = (data: CreateInventoryItemRequest): void => {
  if (!data.name || data.name.trim().length < 2) {
    throw new ValidationError('Item name must be at least 2 characters long', 'name');
  }
  
  if (!data.sku || !isValidSKU(data.sku)) {
    throw new ValidationError('SKU must be 3-50 characters and contain only letters, numbers, hyphens, and underscores', 'sku');
  }
  
  if (!data.category || data.category.trim().length < 2) {
    throw new ValidationError('Category must be at least 2 characters long', 'category');
  }
  
  if (!isValidPrice(data.unitPrice)) {
    throw new ValidationError('Unit price must be a valid positive number', 'unitPrice');
  }
  
  if (!data.location || data.location.trim().length < 2) {
    throw new ValidationError('Location must be at least 2 characters long', 'location');
  }
  
  if (data.stockLevel !== undefined && !isValidStock(data.stockLevel)) {
    throw new ValidationError('Stock level must be a non-negative integer', 'stockLevel');
  }
  
  if (data.minStock !== undefined && !isValidStock(data.minStock)) {
    throw new ValidationError('Minimum stock must be a non-negative integer', 'minStock');
  }
  
  if (data.maxStock !== undefined && (!isValidStock(data.maxStock) || data.maxStock < (data.minStock || 0))) {
    throw new ValidationError('Maximum stock must be a non-negative integer greater than minimum stock', 'maxStock');
  }
};

export const validateUpdateInventoryItem = (data: UpdateInventoryItemRequest): void => {
  if (data.name && data.name.trim().length < 2) {
    throw new ValidationError('Item name must be at least 2 characters long', 'name');
  }
  
  if (data.category && data.category.trim().length < 2) {
    throw new ValidationError('Category must be at least 2 characters long', 'category');
  }
  
  if (data.unitPrice !== undefined && !isValidPrice(data.unitPrice)) {
    throw new ValidationError('Unit price must be a valid positive number', 'unitPrice');
  }
  
  if (data.location && data.location.trim().length < 2) {
    throw new ValidationError('Location must be at least 2 characters long', 'location');
  }
  
  if (data.minStock !== undefined && !isValidStock(data.minStock)) {
    throw new ValidationError('Minimum stock must be a non-negative integer', 'minStock');
  }
  
  if (data.maxStock !== undefined && !isValidStock(data.maxStock)) {
    throw new ValidationError('Maximum stock must be a non-negative integer', 'maxStock');
  }
};

// Inventory action validation
export const validateCreateInventoryAction = (data: CreateInventoryActionRequest): void => {
  if (!Object.values(ActionType).includes(data.type)) {
    throw new ValidationError('Invalid action type', 'type');
  }
  
  if (!Number.isInteger(data.quantity) || data.quantity <= 0) {
    throw new ValidationError('Quantity must be a positive integer', 'quantity');
  }
  
  if (!data.itemId || data.itemId.trim().length === 0) {
    throw new ValidationError('Item ID is required', 'itemId');
  }
};

// Login validation
export const validateLogin = (data: LoginRequest): void => {
  if (!data.email || !isValidEmail(data.email)) {
    throw new ValidationError('Valid email is required', 'email');
  }
  
  if (!data.password || data.password.length === 0) {
    throw new ValidationError('Password is required', 'password');
  }
};