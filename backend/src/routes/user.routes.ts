import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { UserController } from '../controllers/user.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

export function createUserRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const userController = new UserController(prisma);
  const authMiddleware = new AuthMiddleware(prisma);

  // All user routes require authentication
  router.use(authMiddleware.authenticate);

  // Admin-only routes for user management
  router.get('/', authMiddleware.requireAdmin, userController.getAllUsers);
  router.post('/', authMiddleware.requireAdmin, userController.createUser);
  router.put('/:id', authMiddleware.requireAdmin, userController.updateUser);
  router.patch('/:id/deactivate', authMiddleware.requireAdmin, userController.deactivateUser);
  router.patch('/:id/activate', authMiddleware.requireAdmin, userController.activateUser);
  router.delete('/:id', authMiddleware.requireAdmin, userController.deleteUser);

  // Route accessible to both admin and user (with restrictions)
  router.get('/:id', authMiddleware.requireUser, userController.getUserById);

  return router;
}