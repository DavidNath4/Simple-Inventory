import { Request, Response } from 'express';
import { UserController } from '../../controllers/user.controller';
import { mockPrismaClient } from '../setup';
import { UserRole } from '@prisma/client';

describe('UserController', () => {
  let userController: UserController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    userController = new UserController(mockPrismaClient);
    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: { id: 'admin-id', role: 'ADMIN' as UserRole, email: 'admin@test.com', name: 'Admin User' },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('getAllUsers', () => {
    it('should return all active users by default', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@test.com', name: 'User 1', role: 'USER', isActive: true, password: 'hashed' },
        { id: '2', email: 'user2@test.com', name: 'User 2', role: 'ADMIN', isActive: true, password: 'hashed' },
      ];

      mockPrismaClient.user.findMany = jest.fn().mockResolvedValue(mockUsers);

      await userController.getAllUsers(mockRequest as Request, mockResponse as Response);

      expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [
          { id: '1', email: 'user1@test.com', name: 'User 1', role: 'USER', isActive: true },
          { id: '2', email: 'user2@test.com', name: 'User 2', role: 'ADMIN', isActive: true },
        ],
      });
    });

    it('should return all users including inactive when includeInactive is true', async () => {
      mockRequest.query = { includeInactive: 'true' };
      const mockUsers = [
        { id: '1', email: 'user1@test.com', name: 'User 1', role: 'USER', isActive: true, password: 'hashed' },
        { id: '2', email: 'user2@test.com', name: 'User 2', role: 'USER', isActive: false, password: 'hashed' },
      ];

      mockPrismaClient.user.findMany = jest.fn().mockResolvedValue(mockUsers);

      await userController.getAllUsers(mockRequest as Request, mockResponse as Response);

      expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle database errors', async () => {
      mockPrismaClient.user.findMany = jest.fn().mockRejectedValue(new Error('Database error'));

      await userController.getAllUsers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database operation failed: find all users',
      });
    });
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      mockRequest.body = {
        email: 'newuser@test.com',
        password: 'password123',
        name: 'New User',
        role: 'USER',
      };

      const mockCreatedUser = {
        id: 'new-user-id',
        email: 'newuser@test.com',
        name: 'New User',
        role: 'USER',
        isActive: true,
        password: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.user.create = jest.fn().mockResolvedValue(mockCreatedUser);

      await userController.createUser(mockRequest as Request, mockResponse as Response);

      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'newuser@test.com',
          name: 'New User',
          role: 'USER',
          password: expect.any(String), // hashed password
        }),
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'new-user-id',
          email: 'newuser@test.com',
          name: 'New User',
          role: 'USER',
        }),
        message: 'User created successfully',
      });
    });

    it('should return 400 when required fields are missing', async () => {
      mockRequest.body = { email: 'test@test.com' }; // missing password and name

      await userController.createUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email, password, and name are required',
      });
    });

    it('should handle duplicate email errors', async () => {
      mockRequest.body = {
        email: 'existing@test.com',
        password: 'password123',
        name: 'Test User',
      };

      mockPrismaClient.user.create = jest.fn().mockRejectedValue(new Error('Email already exists'));

      await userController.createUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database operation failed: create user',
      });
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      mockRequest.params = { id: 'user-id' };
      mockRequest.body = { name: 'Updated Name', role: 'ADMIN' };

      const mockUpdatedUser = {
        id: 'user-id',
        email: 'user@test.com',
        name: 'Updated Name',
        role: 'ADMIN',
        isActive: true,
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.user.update = jest.fn().mockResolvedValue(mockUpdatedUser);

      await userController.updateUser(mockRequest as Request, mockResponse as Response);

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { name: 'Updated Name', role: 'ADMIN' },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'user-id',
          name: 'Updated Name',
          role: 'ADMIN',
        }),
        message: 'User updated successfully',
      });
    });

    it('should handle user not found error', async () => {
      mockRequest.params = { id: 'nonexistent-id' };
      mockRequest.body = { name: 'Updated Name' };

      mockPrismaClient.user.update = jest.fn().mockRejectedValue(new Error('User not found'));

      await userController.updateUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database operation failed: update user',
      });
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      mockRequest.params = { id: 'user-id' };

      const mockDeactivatedUser = {
        id: 'user-id',
        email: 'user@test.com',
        name: 'Test User',
        role: 'USER',
        isActive: false,
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.user.update = jest.fn().mockResolvedValue(mockDeactivatedUser);

      await userController.deactivateUser(mockRequest as Request, mockResponse as Response);

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { isActive: false },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'user-id',
          isActive: false,
        }),
        message: 'User deactivated successfully',
      });
    });

    it('should prevent admin from deactivating themselves', async () => {
      mockRequest.params = { id: 'admin-id' }; // same as current user

      await userController.deactivateUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot deactivate your own account',
      });
      expect(mockPrismaClient.user.update).not.toHaveBeenCalled();
    });
  });

  describe('activateUser', () => {
    it('should activate user successfully', async () => {
      mockRequest.params = { id: 'user-id' };

      const mockActivatedUser = {
        id: 'user-id',
        email: 'user@test.com',
        name: 'Test User',
        role: 'USER',
        isActive: true,
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.user.update = jest.fn().mockResolvedValue(mockActivatedUser);

      await userController.activateUser(mockRequest as Request, mockResponse as Response);

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { isActive: true },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'user-id',
          isActive: true,
        }),
        message: 'User activated successfully',
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockRequest.params = { id: 'user-id' };

      mockPrismaClient.user.delete = jest.fn().mockResolvedValue({});

      await userController.deleteUser(mockRequest as Request, mockResponse as Response);

      expect(mockPrismaClient.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-id' },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted successfully',
      });
    });

    it('should prevent admin from deleting themselves', async () => {
      mockRequest.params = { id: 'admin-id' }; // same as current user

      await userController.deleteUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot delete your own account',
      });
      expect(mockPrismaClient.user.delete).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should allow admin to get any user', async () => {
      mockRequest.params = { id: 'other-user-id' };

      const mockUser = {
        id: 'other-user-id',
        email: 'other@test.com',
        name: 'Other User',
        role: 'USER',
        isActive: true,
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      await userController.getUserById(mockRequest as Request, mockResponse as Response);

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'other-user-id' },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'other-user-id',
          email: 'other@test.com',
        }),
      });
    });

    it('should allow user to get their own data', async () => {
      mockRequest.user = { id: 'user-id', role: 'USER' as UserRole, email: 'user@test.com', name: 'Regular User' };
      mockRequest.params = { id: 'user-id' };

      const mockUser = {
        id: 'user-id',
        email: 'user@test.com',
        name: 'User',
        role: 'USER',
        isActive: true,
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      await userController.getUserById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should deny user access to other users data', async () => {
      mockRequest.user = { id: 'user-id', role: 'USER' as UserRole, email: 'user@test.com', name: 'Regular User' };
      mockRequest.params = { id: 'other-user-id' };

      await userController.getUserById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied',
      });
      expect(mockPrismaClient.user.findUnique).not.toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      mockRequest.params = { id: 'nonexistent-id' };

      mockPrismaClient.user.findUnique = jest.fn().mockRejectedValue(new Error('User not found'));

      await userController.getUserById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database operation failed: find user by id',
      });
    });
  });
});