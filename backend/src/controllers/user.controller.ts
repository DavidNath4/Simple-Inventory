import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { UserRepository } from '../repositories/user.repository';
import { AuthService } from '../services/auth.service';
import { CreateUserRequest, UpdateUserRequest, ApiResponse, AuthUser } from '../types';

export class UserController {
  private userRepository: UserRepository;
  private authService: AuthService;

  constructor(prisma: PrismaClient) {
    this.userRepository = new UserRepository(prisma);
    this.authService = new AuthService(prisma);
  }

  // Admin only: Get all users
  getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const users = await this.userRepository.findAll(includeInactive);

      // Remove password from response
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });

      res.status(200).json({
        success: true,
        data: safeUsers,
      } as ApiResponse<typeof safeUsers>);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get users',
      } as ApiResponse<null>);
    }
  };

  // Admin only: Create new user
  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userData: CreateUserRequest = req.body;

      // Validate required fields
      if (!userData.email || !userData.password || !userData.name) {
        res.status(400).json({
          success: false,
          error: 'Email, password, and name are required',
        } as ApiResponse<null>);
        return;
      }

      // Hash password before storing
      const hashedPassword = await this.authService.hashPassword(userData.password);
      
      const user = await this.userRepository.create({
        ...userData,
        password: hashedPassword,
      });

      // Remove password from response
      const { password, ...safeUser } = user;

      res.status(201).json({
        success: true,
        data: safeUser,
        message: 'User created successfully',
      } as ApiResponse<typeof safeUser>);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
      } as ApiResponse<null>);
    }
  };

  // Admin only: Update user
  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id;
      const updateData: UpdateUserRequest = req.body;

      const user = await this.userRepository.update(userId, updateData);

      // Remove password from response
      const { password, ...safeUser } = user;

      res.status(200).json({
        success: true,
        data: safeUser,
        message: 'User updated successfully',
      } as ApiResponse<typeof safeUser>);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user',
      } as ApiResponse<null>);
    }
  };

  // Admin only: Deactivate user
  deactivateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id;

      // Prevent admin from deactivating themselves
      if (req.user?.id === userId) {
        res.status(400).json({
          success: false,
          error: 'Cannot deactivate your own account',
        } as ApiResponse<null>);
        return;
      }

      const user = await this.userRepository.deactivate(userId);

      // Remove password from response
      const { password, ...safeUser } = user;

      res.status(200).json({
        success: true,
        data: safeUser,
        message: 'User deactivated successfully',
      } as ApiResponse<typeof safeUser>);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deactivate user',
      } as ApiResponse<null>);
    }
  };

  // Admin only: Activate user
  activateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id;
      const user = await this.userRepository.activate(userId);

      // Remove password from response
      const { password, ...safeUser } = user;

      res.status(200).json({
        success: true,
        data: safeUser,
        message: 'User activated successfully',
      } as ApiResponse<typeof safeUser>);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to activate user',
      } as ApiResponse<null>);
    }
  };

  // Admin only: Delete user
  deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id;

      // Prevent admin from deleting themselves
      if (req.user?.id === userId) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete your own account',
        } as ApiResponse<null>);
        return;
      }

      await this.userRepository.delete(userId);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      } as ApiResponse<null>);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user',
      } as ApiResponse<null>);
    }
  };

  // Get user by ID (accessible to both admin and user, but users can only access their own data)
  getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id;
      const currentUser = req.user;

      // Users can only access their own data, admins can access any user's data
      if (currentUser?.role !== 'ADMIN' && currentUser?.id !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        } as ApiResponse<null>);
        return;
      }

      const user = await this.userRepository.findById(userId);

      // Remove password from response
      const { password, ...safeUser } = user;

      res.status(200).json({
        success: true,
        data: safeUser,
      } as ApiResponse<typeof safeUser>);
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'User not found',
      } as ApiResponse<null>);
    }
  };
}