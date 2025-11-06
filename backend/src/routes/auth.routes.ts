import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthController } from '../controllers/auth.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

export function createAuthRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const authController = new AuthController(prisma);
  const authMiddleware = new AuthMiddleware(prisma);

  // Public routes
  router.post('/login', authController.login);
  router.post('/logout', authController.logout);

  // Protected routes
  router.get('/me', authMiddleware.authenticate, authController.me);

  return router;
}