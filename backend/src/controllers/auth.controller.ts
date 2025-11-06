import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import { LoginRequest, ApiResponse, LoginResponse } from '../types';

export class AuthController {
  private authService: AuthService;

  constructor(prisma: PrismaClient) {
    this.authService = new AuthService(prisma);
  }

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const loginData: LoginRequest = req.body;

      // Validate required fields
      if (!loginData.email || !loginData.password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required',
        } as ApiResponse<null>);
        return;
      }

      // Attempt login
      const result = await this.authService.login(loginData);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Login successful',
      } as ApiResponse<LoginResponse>);
    } catch (error) {
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      } as ApiResponse<null>);
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    // For JWT, logout is handled client-side by removing the token
    // Server-side logout would require token blacklisting (not implemented in this basic version)
    res.status(200).json({
      success: true,
      message: 'Logout successful',
    } as ApiResponse<null>);
  };

  me = async (req: Request, res: Response): Promise<void> => {
    try {
      // User is already attached to request by auth middleware
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        } as ApiResponse<null>);
        return;
      }

      res.status(200).json({
        success: true,
        data: req.user,
      } as ApiResponse<typeof req.user>);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get user information',
      } as ApiResponse<null>);
    }
  };
}