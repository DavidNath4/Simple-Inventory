import { Request, Response, NextFunction } from 'express';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { AuthService } from '../../services/auth.service';
import { mockPrismaClient } from '../setup';
import { AuthUser } from '../../types';

// Mock the AuthService
jest.mock('../../services/auth.service');

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    authMiddleware = new AuthMiddleware(mockPrismaClient);
    mockAuthService = authMiddleware['authService'] as jest.Mocked<AuthService>;
    
    mockRequest = {
      headers: {},
      user: undefined,
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    mockNext = jest.fn();
  });

  describe('authenticate', () => {
    it('should authenticate user with valid token', async () => {
      const mockUser: AuthUser = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN',
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-jwt-token',
      };

      mockAuthService.getUserFromToken = jest.fn().mockResolvedValue(mockUser);

      await authMiddleware.authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.getUserFromToken).toHaveBeenCalledWith('valid-jwt-token');
      expect(mockRequest.user).toBe(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when authorization header is missing', async () => {
      mockRequest.headers = {};

      await authMiddleware.authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', async () => {
      mockRequest.headers = {
        authorization: 'Basic invalid-token',
      };

      await authMiddleware.authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      mockAuthService.getUserFromToken = jest.fn().mockRejectedValue(new Error('Invalid token'));

      await authMiddleware.authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow access for admin user', () => {
      const mockAdminUser: AuthUser = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN',
      };

      mockRequest.user = mockAdminUser;

      authMiddleware.requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      mockRequest.user = undefined;

      authMiddleware.requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not admin', () => {
      const mockRegularUser: AuthUser = {
        id: '2',
        email: 'user@example.com',
        name: 'Regular User',
        role: 'USER',
      };

      mockRequest.user = mockRegularUser;

      authMiddleware.requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Admin privileges required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireUser', () => {
    it('should allow access for admin user', () => {
      const mockAdminUser: AuthUser = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN',
      };

      mockRequest.user = mockAdminUser;

      authMiddleware.requireUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow access for regular user', () => {
      const mockRegularUser: AuthUser = {
        id: '2',
        email: 'user@example.com',
        name: 'Regular User',
        role: 'USER',
      };

      mockRequest.user = mockRegularUser;

      authMiddleware.requireUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      mockRequest.user = undefined;

      authMiddleware.requireUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});