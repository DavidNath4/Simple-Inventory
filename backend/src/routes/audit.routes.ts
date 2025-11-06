import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuditController } from '../controllers/audit.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

export function createAuditRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const auditController = new AuditController(prisma);
  const authMiddleware = new AuthMiddleware(prisma);

  // All audit routes require authentication and admin privileges
  router.use(authMiddleware.authenticate);
  router.use(authMiddleware.requireAdmin);

  // Get all audit logs with pagination
  router.get('/', auditController.getAllAuditLogs);

  // Get audit logs by user ID
  router.get('/user/:userId', auditController.getAuditLogsByUser);

  // Get audit logs by resource type
  router.get('/resource-type/:resourceType', auditController.getAuditLogsByResourceType);

  // Get audit logs by resource ID
  router.get('/resource/:resourceId', auditController.getAuditLogsByResourceId);

  // Get audit logs by date range
  router.get('/date-range', auditController.getAuditLogsByDateRange);

  // Delete old audit logs
  router.delete('/cleanup', auditController.deleteOldAuditLogs);

  return router;
}