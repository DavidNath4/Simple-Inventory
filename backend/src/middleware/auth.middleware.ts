import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import { AuthUser } from '../types';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export class AuthMiddleware {
  private authService: AuthService;

  constructor(prisma: PrismaClient) {
    this.authService = new AuthService(prisma);
  }

  // Middleware to authenticate JWT token
  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'Access token required',
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Verify token and get user
      const user = await this.authService.getUserFromToken(token);
      
      // Attach user to request object
      req.user = user;
      
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  };

  // Middleware to check if user has admin role
  requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (req.user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'Admin privileges required',
      });
      return;
    }

    next();
  };

  // Middleware to check if user has admin or user role (both allowed)
  requireUser = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'USER') {
      res.status(403).json({
        success: false,
        error: 'User privileges required',
      });
      return;
    }

    next();
  };
}