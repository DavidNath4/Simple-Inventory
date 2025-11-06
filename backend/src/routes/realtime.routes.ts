import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { WebSocketService } from '../services/websocket.service';

export function createRealTimeRoutes(prisma: PrismaClient, webSocketService?: WebSocketService): Router {
  const router = Router();
  const authMiddleware = new AuthMiddleware(prisma);

  // All real-time routes require authentication
  router.use(authMiddleware.authenticate);

  // POST /api/realtime/test-broadcast - Test broadcasting (for development/testing)
  router.post('/test-broadcast', (req, res) => {
    try {
      const { type, message } = req.body;
      
      if (!webSocketService) {
        res.status(503).json({
          success: false,
          error: 'WebSocket service not available'
        });
        return;
      }

      switch (type) {
        case 'notification':
          webSocketService.broadcastSystemNotification({
            type: 'info',
            title: 'Test Notification',
            message: message || 'This is a test notification'
          });
          break;
        case 'inventory':
          webSocketService.broadcastInventoryUpdate({
            type: 'updated',
            item: {
              id: 'test-item',
              name: 'Test Item',
              sku: 'TEST-001',
              stockLevel: 100
            } as any,
            userId: (req as any).user?.id
          });
          break;
        case 'alert':
          webSocketService.broadcastAlert({
            id: 'test-alert',
            type: 'low_stock',
            severity: 'medium',
            title: 'Test Alert',
            message: message || 'This is a test alert',
            itemName: 'Test Item',
            currentStock: 5,
            minStock: 10
          });
          break;
        default:
          res.status(400).json({
            success: false,
            error: 'Invalid broadcast type. Use: notification, inventory, or alert'
          });
          return;
      }

      res.json({
        success: true,
        message: `Test ${type} broadcast sent`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to send test broadcast',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // GET /api/realtime/status - Get WebSocket connection status
  router.get('/status', (req, res) => {
    try {
      if (!webSocketService) {
        res.status(503).json({
          success: false,
          error: 'WebSocket service not available'
        });
        return;
      }

      const connectedUsers = webSocketService.getConnectedUsersCount();
      const adminUsers = webSocketService.getConnectedUsersByRole('ADMIN').length;
      const regularUsers = webSocketService.getConnectedUsersByRole('USER').length;

      res.json({
        success: true,
        data: {
          totalConnectedUsers: connectedUsers,
          adminUsers,
          regularUsers,
          isUserConnected: webSocketService.isUserConnected((req as any).user?.id)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get WebSocket status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}