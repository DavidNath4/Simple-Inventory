import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { AuditMiddleware } from '../middleware/audit.middleware';
import { createUserRoutes } from './user.routes';

export function createAdminRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const authMiddleware = new AuthMiddleware(prisma);
  const auditMiddleware = new AuditMiddleware(prisma);

  // All admin routes require authentication and admin privileges
  router.use(authMiddleware.authenticate);
  router.use(authMiddleware.requireAdmin);

  // Admin dashboard endpoint with audit logging
  router.get('/dashboard', auditMiddleware.logSystemConfiguration('VIEW_ADMIN_DASHBOARD'), async (req, res) => {
    try {
      // Get basic system statistics (admin only)
      const userCount = await prisma.user.count();
      const activeUserCount = await prisma.user.count({ where: { isActive: true } });
      const inventoryItemCount = await prisma.inventoryItem.count();
      const recentActions = await prisma.inventoryAction.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      res.json({
        success: true,
        data: {
          users: {
            total: userCount,
            active: activeUserCount,
            inactive: userCount - activeUserCount,
          },
          inventory: {
            totalItems: inventoryItemCount,
          },
          activity: {
            recentActions,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get admin dashboard data',
      });
    }
  });

  // Mount user management routes under /admin/users
  router.use('/users', createUserRoutes(prisma));

  return router;
}