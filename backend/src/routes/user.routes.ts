import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { UserController } from '../controllers/user.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { AuditMiddleware } from '../middleware/audit.middleware';

export function createUserRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const userController = new UserController(prisma);
  const authMiddleware = new AuthMiddleware(prisma);
  const auditMiddleware = new AuditMiddleware(prisma);

  // All user routes require authentication
  router.use(authMiddleware.authenticate);

  // Admin-only routes for user management with audit logging
  router.get('/', authMiddleware.requireAdmin, auditMiddleware.logUserManagement('VIEW_USERS'), userController.getAllUsers);
  router.post('/', authMiddleware.requireAdmin, auditMiddleware.logUserManagement('CREATE_USER'), userController.createUser);
  router.put('/:id', authMiddleware.requireAdmin, auditMiddleware.logUserManagement('UPDATE_USER'), userController.updateUser);
  router.patch('/:id/deactivate', authMiddleware.requireAdmin, auditMiddleware.logUserManagement('DEACTIVATE_USER'), userController.deactivateUser);
  router.patch('/:id/activate', authMiddleware.requireAdmin, auditMiddleware.logUserManagement('ACTIVATE_USER'), userController.activateUser);
  router.delete('/:id', authMiddleware.requireAdmin, auditMiddleware.logUserManagement('DELETE_USER'), userController.deleteUser);

  // Route accessible to both admin and user (with restrictions) - no audit logging for regular user access
  router.get('/:id', authMiddleware.requireUser, userController.getUserById);

  return router;
}