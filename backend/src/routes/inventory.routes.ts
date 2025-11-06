import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { InventoryController } from '../controllers/inventory.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { WebSocketService } from '../services/websocket.service';

export function createInventoryRoutes(prisma: PrismaClient, webSocketService?: WebSocketService): Router {
  const router = Router();
  const inventoryController = new InventoryController(prisma, webSocketService);
  const authMiddleware = new AuthMiddleware(prisma);

  // All inventory routes require authentication
  router.use(authMiddleware.authenticate);

  // GET /api/inventory - Get all inventory items with filtering and search
  // Accessible to both Admin and User roles
  router.get('/', (req, res) => inventoryController.getInventoryItems(req, res));

  // GET /api/inventory/categories - Get all unique categories
  // Accessible to both Admin and User roles
  router.get('/categories', (req, res) => inventoryController.getCategories(req, res));

  // GET /api/inventory/locations - Get all unique locations
  // Accessible to both Admin and User roles
  router.get('/locations', (req, res) => inventoryController.getLocations(req, res));

  // GET /api/inventory/low-stock - Get items with low stock
  // Accessible to both Admin and User roles
  router.get('/low-stock', (req, res) => inventoryController.getLowStockItems(req, res));

  // GET /api/inventory/alerts - Get all current low stock alerts
  // Accessible to both Admin and User roles
  router.get('/alerts', (req, res) => inventoryController.getAlerts(req, res));

  // GET /api/inventory/alerts/statistics - Get alert statistics
  // Accessible to both Admin and User roles
  router.get('/alerts/statistics', (req, res) => inventoryController.getAlertStatistics(req, res));

  // GET /api/inventory/monitor - Monitor stock levels with categorized results
  // Accessible to both Admin and User roles
  router.get('/monitor', (req, res) => inventoryController.monitorStockLevels(req, res));

  // POST /api/inventory/alerts/check - Trigger manual alert check
  // Accessible to both Admin and User roles
  router.post('/alerts/check', (req, res) => inventoryController.triggerAlertCheck(req, res));

  // GET /api/inventory/:id - Get single inventory item by ID
  // Accessible to both Admin and User roles
  router.get('/:id', (req, res) => inventoryController.getInventoryItem(req, res));

  // POST /api/inventory - Create new inventory item
  // Accessible to both Admin and User roles
  router.post('/', (req, res) => inventoryController.createInventoryItem(req, res));

  // PUT /api/inventory/:id - Update inventory item
  // Accessible to both Admin and User roles
  router.put('/:id', (req, res) => inventoryController.updateInventoryItem(req, res));

  // DELETE /api/inventory/:id - Delete inventory item
  // Accessible to both Admin and User roles
  router.delete('/:id', (req, res) => inventoryController.deleteInventoryItem(req, res));

  // POST /api/inventory/:id/stock - Update stock level with tracking
  // Accessible to both Admin and User roles
  router.post('/:id/stock', (req, res) => inventoryController.updateStock(req, res));

  // GET /api/inventory/:id/actions - Get inventory movement history
  // Accessible to both Admin and User roles
  router.get('/:id/actions', (req, res) => inventoryController.getInventoryActions(req, res));

  // POST /api/inventory/:id/adjust - Quick stock adjustment
  // Accessible to both Admin and User roles
  router.post('/:id/adjust', (req, res) => inventoryController.adjustStock(req, res));

  // POST /api/inventory/alerts/check - Trigger manual alert check
  // Accessible to both Admin and User roles
  router.post('/alerts/check', (req, res) => inventoryController.triggerAlertCheck(req, res));

  // Bulk operations routes
  // POST /api/inventory/bulk/create - Bulk create inventory items
  // Accessible to both Admin and User roles
  router.post('/bulk/create', (req, res) => inventoryController.bulkCreateItems(req, res));

  // POST /api/inventory/bulk/update - Bulk update inventory items
  // Accessible to both Admin and User roles
  router.post('/bulk/update', (req, res) => inventoryController.bulkUpdateItems(req, res));

  // POST /api/inventory/bulk/stock - Bulk update stock levels
  // Accessible to both Admin and User roles
  router.post('/bulk/stock', (req, res) => inventoryController.bulkUpdateStock(req, res));

  // DELETE /api/inventory/bulk/delete - Bulk delete inventory items
  // Accessible to both Admin and User roles
  router.delete('/bulk/delete', (req, res) => inventoryController.bulkDeleteItems(req, res));

  return router;
}