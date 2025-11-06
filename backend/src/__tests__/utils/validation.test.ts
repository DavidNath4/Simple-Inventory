import {
  ValidationError,
  isValidEmail,
  isValidPassword,
  isValidSKU,
  isValidPrice,
  isValidStock,
  validateCreateUser,
  validateUpdateUser,
  validateCreateInventoryItem,
  validateUpdateInventoryItem,
  validateCreateInventoryAction,
  validateLogin,
} from '../../utils/validation';
import { UserRole, ActionType } from '@prisma/client';

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('admin+test@company.org')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('should return true for passwords with 6+ characters', () => {
      expect(isValidPassword('password123')).toBe(true);
      expect(isValidPassword('123456')).toBe(true);
    });

    it('should return false for passwords with less than 6 characters', () => {
      expect(isValidPassword('12345')).toBe(false);
      expect(isValidPassword('')).toBe(false);
    });
  });

  describe('isValidSKU', () => {
    it('should return true for valid SKUs', () => {
      expect(isValidSKU('ABC123')).toBe(true);
      expect(isValidSKU('ITEM-001')).toBe(true);
      expect(isValidSKU('SKU_123')).toBe(true);
    });

    it('should return false for invalid SKUs', () => {
      expect(isValidSKU('ab')).toBe(false); // too short
      expect(isValidSKU('abc123')).toBe(false); // lowercase
      expect(isValidSKU('ABC 123')).toBe(false); // contains space
      expect(isValidSKU('')).toBe(false);
    });
  });

  describe('isValidPrice', () => {
    it('should return true for valid prices', () => {
      expect(isValidPrice(0)).toBe(true);
      expect(isValidPrice(10.99)).toBe(true);
      expect(isValidPrice(100)).toBe(true);
    });

    it('should return false for invalid prices', () => {
      expect(isValidPrice(-1)).toBe(false);
      expect(isValidPrice(Infinity)).toBe(false);
      expect(isValidPrice(NaN)).toBe(false);
    });
  });

  describe('isValidStock', () => {
    it('should return true for valid stock levels', () => {
      expect(isValidStock(0)).toBe(true);
      expect(isValidStock(100)).toBe(true);
    });

    it('should return false for invalid stock levels', () => {
      expect(isValidStock(-1)).toBe(false);
      expect(isValidStock(10.5)).toBe(false);
      expect(isValidStock(NaN)).toBe(false);
    });
  });

  describe('validateCreateUser', () => {
    it('should pass validation for valid user data', () => {
      const validUser = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: UserRole.USER,
      };

      expect(() => validateCreateUser(validUser)).not.toThrow();
    });

    it('should throw ValidationError for invalid email', () => {
      const invalidUser = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User',
      };

      expect(() => validateCreateUser(invalidUser)).toThrow(ValidationError);
      expect(() => validateCreateUser(invalidUser)).toThrow('Valid email is required');
    });

    it('should throw ValidationError for short password', () => {
      const invalidUser = {
        email: 'test@example.com',
        password: '123',
        name: 'Test User',
      };

      expect(() => validateCreateUser(invalidUser)).toThrow(ValidationError);
      expect(() => validateCreateUser(invalidUser)).toThrow('Password must be at least 6 characters long');
    });

    it('should throw ValidationError for short name', () => {
      const invalidUser = {
        email: 'test@example.com',
        password: 'password123',
        name: 'A',
      };

      expect(() => validateCreateUser(invalidUser)).toThrow(ValidationError);
      expect(() => validateCreateUser(invalidUser)).toThrow('Name must be at least 2 characters long');
    });
  });

  describe('validateCreateInventoryItem', () => {
    it('should pass validation for valid inventory item data', () => {
      const validItem = {
        name: 'Test Item',
        sku: 'TEST-001',
        category: 'Electronics',
        unitPrice: 99.99,
        location: 'Warehouse A',
        stockLevel: 10,
        minStock: 5,
        maxStock: 100,
      };

      expect(() => validateCreateInventoryItem(validItem)).not.toThrow();
    });

    it('should throw ValidationError for invalid SKU', () => {
      const invalidItem = {
        name: 'Test Item',
        sku: 'invalid sku',
        category: 'Electronics',
        unitPrice: 99.99,
        location: 'Warehouse A',
      };

      expect(() => validateCreateInventoryItem(invalidItem)).toThrow(ValidationError);
      expect(() => validateCreateInventoryItem(invalidItem)).toThrow('SKU must be 3-50 characters');
    });

    it('should throw ValidationError for negative price', () => {
      const invalidItem = {
        name: 'Test Item',
        sku: 'TEST-001',
        category: 'Electronics',
        unitPrice: -10,
        location: 'Warehouse A',
      };

      expect(() => validateCreateInventoryItem(invalidItem)).toThrow(ValidationError);
      expect(() => validateCreateInventoryItem(invalidItem)).toThrow('Unit price must be a valid positive number');
    });

    it('should throw ValidationError when maxStock is less than minStock', () => {
      const invalidItem = {
        name: 'Test Item',
        sku: 'TEST-001',
        category: 'Electronics',
        unitPrice: 99.99,
        location: 'Warehouse A',
        minStock: 10,
        maxStock: 5,
      };

      expect(() => validateCreateInventoryItem(invalidItem)).toThrow(ValidationError);
      expect(() => validateCreateInventoryItem(invalidItem)).toThrow('Maximum stock must be a non-negative integer greater than minimum stock');
    });
  });

  describe('validateCreateInventoryAction', () => {
    it('should pass validation for valid inventory action data', () => {
      const validAction = {
        type: ActionType.ADD_STOCK,
        quantity: 10,
        itemId: 'item-123',
        notes: 'Test action',
      };

      expect(() => validateCreateInventoryAction(validAction)).not.toThrow();
    });

    it('should throw ValidationError for invalid action type', () => {
      const invalidAction = {
        type: 'INVALID_TYPE' as ActionType,
        quantity: 10,
        itemId: 'item-123',
      };

      expect(() => validateCreateInventoryAction(invalidAction)).toThrow(ValidationError);
      expect(() => validateCreateInventoryAction(invalidAction)).toThrow('Invalid action type');
    });

    it('should throw ValidationError for zero quantity', () => {
      const invalidAction = {
        type: ActionType.ADD_STOCK,
        quantity: 0,
        itemId: 'item-123',
      };

      expect(() => validateCreateInventoryAction(invalidAction)).toThrow(ValidationError);
      expect(() => validateCreateInventoryAction(invalidAction)).toThrow('Quantity must be a positive integer');
    });

    it('should throw ValidationError for missing itemId', () => {
      const invalidAction = {
        type: ActionType.ADD_STOCK,
        quantity: 10,
        itemId: '',
      };

      expect(() => validateCreateInventoryAction(invalidAction)).toThrow(ValidationError);
      expect(() => validateCreateInventoryAction(invalidAction)).toThrow('Item ID is required');
    });
  });

  describe('validateLogin', () => {
    it('should pass validation for valid login data', () => {
      const validLogin = {
        email: 'test@example.com',
        password: 'password123',
      };

      expect(() => validateLogin(validLogin)).not.toThrow();
    });

    it('should throw ValidationError for invalid email', () => {
      const invalidLogin = {
        email: 'invalid-email',
        password: 'password123',
      };

      expect(() => validateLogin(invalidLogin)).toThrow(ValidationError);
      expect(() => validateLogin(invalidLogin)).toThrow('Valid email is required');
    });

    it('should throw ValidationError for empty password', () => {
      const invalidLogin = {
        email: 'test@example.com',
        password: '',
      };

      expect(() => validateLogin(invalidLogin)).toThrow(ValidationError);
      expect(() => validateLogin(invalidLogin)).toThrow('Password is required');
    });
  });
});