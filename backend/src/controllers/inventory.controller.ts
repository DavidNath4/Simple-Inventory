import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { InventoryItemRepository } from '../repositories/inventory-item.repository';
import { InventoryActionRepository } from '../repositories/inventory-action.repository';
import { AlertService, LowStockAlert } from '../services/alert.service';
import { 
  CreateInventoryItemRequest, 
  UpdateInventoryItemRequest, 
  InventoryFilter, 
  PaginationOptions,
  CreateInventoryActionRequest,
  ActionType,
  ApiResponse,
  PaginatedResponse,
  InventoryItem
} from '../types';
import { validateInventoryItem, validateInventoryAction } from '../utils/validation';

export class InventoryController {
  private inventoryRepository: InventoryItemRepository;
  private actionRepository: InventoryActionRepository;
  private alertService: AlertService;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.inventoryRepository = new InventoryItemRepository(prisma);
    this.actionRepository = new InventoryActionRepository(prisma);
    this.alertService = new AlertService(prisma);
  }

  // GET /api/inventory - Get all inventory items with filtering and pagination
  async getInventoryItems(req: Request, res: Response): Promise<void> {
    try {
      const filter: InventoryFilter = {
        category: req.query.category as string,
        location: req.query.location as string,
        lowStock: req.query.lowStock === 'true',
        search: req.query.search as string,
      };

      const pagination: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
      };

      const result = await this.inventoryRepository.findAll(filter, pagination);
      
      const response: PaginatedResponse<InventoryItem> = {
        data: result.items,
        pagination: {
          page: pagination.page!,
          limit: pagination.limit!,
          total: result.total,
          totalPages: Math.ceil(result.total / pagination.limit!),
        },
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve inventory items',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // GET /api/inventory/:id - Get single inventory item by ID
  async getInventoryItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const item = await this.inventoryRepository.findById(id);
      
      const response: ApiResponse<InventoryItem> = {
        success: true,
        data: item,
      };

      res.json(response);
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to retrieve inventory item',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // POST /api/inventory - Create new inventory item
  async createInventoryItem(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateInventoryItemRequest = req.body;
      
      // Validate input data
      const validation = validateInventoryItem(data);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: validation.errors.join(', '),
        });
        return;
      }

      // Check if SKU already exists
      const existingItem = await this.inventoryRepository.findBySku(data.sku);
      if (existingItem) {
        res.status(409).json({
          success: false,
          error: 'SKU already exists',
          message: `An item with SKU '${data.sku}' already exists`,
        });
        return;
      }

      const item = await this.inventoryRepository.create(data);
      
      const response: ApiResponse<InventoryItem> = {
        success: true,
        data: item,
        message: 'Inventory item created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create inventory item',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // PUT /api/inventory/:id - Update inventory item
  async updateInventoryItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateInventoryItemRequest = req.body;

      // Validate input data
      const validation = validateInventoryItem(data, false); // false for update validation
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: validation.errors.join(', '),
        });
        return;
      }

      const item = await this.inventoryRepository.update(id, data);
      
      const response: ApiResponse<InventoryItem> = {
        success: true,
        data: item,
        message: 'Inventory item updated successfully',
      };

      res.json(response);
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to update inventory item',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // DELETE /api/inventory/:id - Delete inventory item
  async deleteInventoryItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.inventoryRepository.delete(id);
      
      const response: ApiResponse<null> = {
        success: true,
        message: 'Inventory item deleted successfully',
      };

      res.json(response);
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to delete inventory item',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // GET /api/inventory/categories - Get all unique categories
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await this.inventoryRepository.getCategories();
      
      const response: ApiResponse<string[]> = {
        success: true,
        data: categories,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve categories',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // GET /api/inventory/locations - Get all unique locations
  async getLocations(req: Request, res: Response): Promise<void> {
    try {
      const locations = await this.inventoryRepository.getLocations();
      
      const response: ApiResponse<string[]> = {
        success: true,
        data: locations,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve locations',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // GET /api/inventory/low-stock - Get items with low stock
  async getLowStockItems(req: Request, res: Response): Promise<void> {
    try {
      const items = await this.inventoryRepository.findLowStockItems();
      
      const response: ApiResponse<InventoryItem[]> = {
        success: true,
        data: items,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve low stock items',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // POST /api/inventory/:id/stock - Update stock level with tracking
  async updateStock(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { quantity, type, notes } = req.body;
      const userId = (req as any).user?.id; // From auth middleware

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
        return;
      }

      // Validate input
      if (!quantity || !Number.isInteger(quantity) || quantity <= 0) {
        res.status(400).json({
          success: false,
          error: 'Quantity must be a positive integer',
        });
        return;
      }

      if (!type || !Object.values(ActionType).includes(type)) {
        res.status(400).json({
          success: false,
          error: 'Valid action type is required (ADD_STOCK, REMOVE_STOCK, ADJUST_STOCK, TRANSFER)',
        });
        return;
      }

      // Get current item to validate stock changes
      const currentItem = await this.inventoryRepository.findById(id);
      let newStockLevel: number;

      switch (type) {
        case ActionType.ADD_STOCK:
          newStockLevel = currentItem.stockLevel + quantity;
          break;
        case ActionType.REMOVE_STOCK:
          newStockLevel = currentItem.stockLevel - quantity;
          if (newStockLevel < 0) {
            res.status(400).json({
              success: false,
              error: 'Cannot remove more stock than available',
              message: `Current stock: ${currentItem.stockLevel}, requested removal: ${quantity}`,
            });
            return;
          }
          break;
        case ActionType.ADJUST_STOCK:
          newStockLevel = quantity; // Direct adjustment to specific level
          break;
        case ActionType.TRANSFER:
          // For transfers, we'll treat it as a removal from this item
          newStockLevel = currentItem.stockLevel - quantity;
          if (newStockLevel < 0) {
            res.status(400).json({
              success: false,
              error: 'Cannot transfer more stock than available',
              message: `Current stock: ${currentItem.stockLevel}, requested transfer: ${quantity}`,
            });
            return;
          }
          break;
        default:
          res.status(400).json({
            success: false,
            error: 'Invalid action type',
          });
          return;
      }

      // Update stock level and create action record in a transaction
      const updatedItem = await this.inventoryRepository.updateStock(id, newStockLevel);
      
      // Create inventory action record for tracking
      const actionData: CreateInventoryActionRequest = {
        type,
        quantity,
        notes,
        itemId: id,
      };

      await this.actionRepository.create(actionData, userId);

      const response: ApiResponse<InventoryItem> = {
        success: true,
        data: updatedItem,
        message: 'Stock level updated successfully',
      };

      res.json(response);
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to update stock level',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // GET /api/inventory/:id/actions - Get inventory movement history
  async getInventoryActions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // Verify item exists
      await this.inventoryRepository.findById(id);

      const actions = await this.actionRepository.findByItemId(id, { page, limit });
      
      const response: PaginatedResponse<any> = {
        data: actions.actions,
        pagination: {
          page,
          limit,
          total: actions.total,
          totalPages: Math.ceil(actions.total / limit),
        },
      };

      res.json(response);
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to retrieve inventory actions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // POST /api/inventory/:id/adjust - Quick stock adjustment
  async adjustStock(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { stockLevel, notes } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
        return;
      }

      // Validate stock level
      if (stockLevel === undefined || !Number.isInteger(stockLevel) || stockLevel < 0) {
        res.status(400).json({
          success: false,
          error: 'Stock level must be a non-negative integer',
        });
        return;
      }

      // Get current item
      const currentItem = await this.inventoryRepository.findById(id);
      const difference = stockLevel - currentItem.stockLevel;

      // Update stock level
      const updatedItem = await this.inventoryRepository.updateStock(id, stockLevel);
      
      // Create action record
      const actionData: CreateInventoryActionRequest = {
        type: ActionType.ADJUST_STOCK,
        quantity: Math.abs(difference),
        notes: notes || `Stock adjusted from ${currentItem.stockLevel} to ${stockLevel}`,
        itemId: id,
      };

      await this.actionRepository.create(actionData, userId);

      const response: ApiResponse<InventoryItem> = {
        success: true,
        data: updatedItem,
        message: 'Stock level adjusted successfully',
      };

      res.json(response);
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to adjust stock level',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // GET /api/inventory/alerts - Get all current low stock alerts
  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const severity = req.query.severity as string;
      const category = req.query.category as string;
      const location = req.query.location as string;

      let alerts: LowStockAlert[];

      if (severity) {
        if (!['LOW', 'CRITICAL', 'OUT_OF_STOCK'].includes(severity)) {
          res.status(400).json({
            success: false,
            error: 'Invalid severity. Must be LOW, CRITICAL, or OUT_OF_STOCK',
          });
          return;
        }
        alerts = await this.alertService.getAlertsBySeverity(severity as any);
      } else if (category) {
        alerts = await this.alertService.getAlertsByCategory(category);
      } else if (location) {
        alerts = await this.alertService.getAlertsByLocation(location);
      } else {
        alerts = await this.alertService.getCurrentAlerts();
      }

      const response: ApiResponse<LowStockAlert[]> = {
        success: true,
        data: alerts,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve alerts',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // GET /api/inventory/alerts/statistics - Get alert statistics
  async getAlertStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = await this.alertService.getAlertStatistics();
      
      const response: ApiResponse<any> = {
        success: true,
        data: statistics,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve alert statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // GET /api/inventory/monitor - Monitor stock levels with categorized results
  async monitorStockLevels(req: Request, res: Response): Promise<void> {
    try {
      const monitoring = await this.alertService.monitorStockLevels();
      
      const response: ApiResponse<any> = {
        success: true,
        data: monitoring,
        message: `Found ${monitoring.outOfStock.length} out of stock, ${monitoring.critical.length} critical, and ${monitoring.lowStock.length} low stock items`,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to monitor stock levels',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // POST /api/inventory/alerts/check - Trigger manual alert check
  async triggerAlertCheck(req: Request, res: Response): Promise<void> {
    try {
      const alerts = await this.alertService.generateLowStockAlerts();
      const statistics = await this.alertService.getAlertStatistics();
      
      const response: ApiResponse<any> = {
        success: true,
        data: {
          alerts,
          statistics,
          timestamp: new Date(),
        },
        message: `Generated ${alerts.length} alerts`,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to trigger alert check',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // POST /api/inventory/bulk/update - Bulk update inventory items
  async bulkUpdateItems(req: Request, res: Response): Promise<void> {
    try {
      const { updates } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
        return;
      }

      if (!Array.isArray(updates) || updates.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Updates array is required and must not be empty',
        });
        return;
      }

      if (updates.length > 100) {
        res.status(400).json({
          success: false,
          error: 'Maximum 100 items can be updated in a single bulk operation',
        });
        return;
      }

      // Validate each update
      const validationErrors: string[] = [];
      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        if (!update.id) {
          validationErrors.push(`Update ${i + 1}: Item ID is required`);
          continue;
        }

        const validation = validateInventoryItem(update, false);
        if (!validation.isValid) {
          validationErrors.push(`Update ${i + 1}: ${validation.errors.join(', ')}`);
        }
      }

      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: validationErrors.join('; '),
        });
        return;
      }

      // Perform bulk update in transaction
      const results = await this.prisma.$transaction(async (tx) => {
        const updatedItems = [];
        
        for (const update of updates) {
          const { id, ...updateData } = update;
          
          const updatedItem = await tx.inventoryItem.update({
            where: { id },
            data: updateData,
          });
          
          updatedItems.push(updatedItem);

          // Create audit log for each update
          await tx.inventoryAction.create({
            data: {
              type: ActionType.ADJUST_STOCK,
              quantity: 0, // Bulk update doesn't change stock directly
              notes: `Bulk update: ${Object.keys(updateData).join(', ')}`,
              userId,
              itemId: id,
            },
          });
        }

        return updatedItems;
      });

      const response: ApiResponse<InventoryItem[]> = {
        success: true,
        data: results,
        message: `Successfully updated ${results.length} items`,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to perform bulk update',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // POST /api/inventory/bulk/stock - Bulk update stock levels
  async bulkUpdateStock(req: Request, res: Response): Promise<void> {
    try {
      const { updates } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
        return;
      }

      if (!Array.isArray(updates) || updates.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Updates array is required and must not be empty',
        });
        return;
      }

      if (updates.length > 100) {
        res.status(400).json({
          success: false,
          error: 'Maximum 100 items can be updated in a single bulk operation',
        });
        return;
      }

      // Validate each stock update
      const validationErrors: string[] = [];
      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        if (!update.id) {
          validationErrors.push(`Update ${i + 1}: Item ID is required`);
          continue;
        }

        if (update.stockLevel === undefined || !Number.isInteger(update.stockLevel) || update.stockLevel < 0) {
          validationErrors.push(`Update ${i + 1}: Stock level must be a non-negative integer`);
        }

        if (update.type && !Object.values(ActionType).includes(update.type)) {
          validationErrors.push(`Update ${i + 1}: Invalid action type`);
        }
      }

      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: validationErrors.join('; '),
        });
        return;
      }

      // Perform bulk stock update in transaction
      const results = await this.prisma.$transaction(async (tx) => {
        const updatedItems = [];
        
        for (const update of updates) {
          const { id, stockLevel, type = ActionType.ADJUST_STOCK, notes } = update;
          
          // Get current item to calculate difference
          const currentItem = await tx.inventoryItem.findUnique({
            where: { id },
          });

          if (!currentItem) {
            throw new Error(`Item with ID ${id} not found`);
          }

          // Update stock level
          const updatedItem = await tx.inventoryItem.update({
            where: { id },
            data: { stockLevel },
          });
          
          updatedItems.push(updatedItem);

          // Create action record
          const difference = Math.abs(stockLevel - currentItem.stockLevel);
          await tx.inventoryAction.create({
            data: {
              type,
              quantity: difference,
              notes: notes || `Bulk stock update from ${currentItem.stockLevel} to ${stockLevel}`,
              userId,
              itemId: id,
            },
          });
        }

        return updatedItems;
      });

      const response: ApiResponse<InventoryItem[]> = {
        success: true,
        data: results,
        message: `Successfully updated stock levels for ${results.length} items`,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to perform bulk stock update',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // POST /api/inventory/bulk/create - Bulk create inventory items
  async bulkCreateItems(req: Request, res: Response): Promise<void> {
    try {
      const { items } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
        return;
      }

      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Items array is required and must not be empty',
        });
        return;
      }

      if (items.length > 50) {
        res.status(400).json({
          success: false,
          error: 'Maximum 50 items can be created in a single bulk operation',
        });
        return;
      }

      // Validate each item
      const validationErrors: string[] = [];
      const skus = new Set<string>();
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Check for duplicate SKUs within the batch
        if (skus.has(item.sku)) {
          validationErrors.push(`Item ${i + 1}: Duplicate SKU '${item.sku}' in batch`);
        } else {
          skus.add(item.sku);
        }

        const validation = validateInventoryItem(item, true);
        if (!validation.isValid) {
          validationErrors.push(`Item ${i + 1}: ${validation.errors.join(', ')}`);
        }
      }

      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: validationErrors.join('; '),
        });
        return;
      }

      // Check for existing SKUs in database
      const existingItems = await this.inventoryRepository.findAll({
        search: Array.from(skus).join(' OR '),
      });

      const existingSKUs = new Set(existingItems.items.map(item => item.sku));
      const duplicateSKUs = Array.from(skus).filter(sku => existingSKUs.has(sku));

      if (duplicateSKUs.length > 0) {
        res.status(409).json({
          success: false,
          error: 'SKU conflicts detected',
          message: `The following SKUs already exist: ${duplicateSKUs.join(', ')}`,
        });
        return;
      }

      // Perform bulk create in transaction
      const results = await this.prisma.$transaction(async (tx) => {
        const createdItems = [];
        
        for (const itemData of items) {
          const createdItem = await tx.inventoryItem.create({
            data: {
              name: itemData.name,
              description: itemData.description,
              sku: itemData.sku,
              category: itemData.category,
              stockLevel: itemData.stockLevel || 0,
              minStock: itemData.minStock || 0,
              maxStock: itemData.maxStock,
              unitPrice: itemData.unitPrice,
              location: itemData.location,
            },
          });
          
          createdItems.push(createdItem);

          // Create initial stock action if stock level > 0
          if (createdItem.stockLevel > 0) {
            await tx.inventoryAction.create({
              data: {
                type: ActionType.ADD_STOCK,
                quantity: createdItem.stockLevel,
                notes: 'Initial stock from bulk creation',
                userId,
                itemId: createdItem.id,
              },
            });
          }
        }

        return createdItems;
      });

      const response: ApiResponse<InventoryItem[]> = {
        success: true,
        data: results,
        message: `Successfully created ${results.length} items`,
      };

      res.status(201).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to perform bulk create',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // DELETE /api/inventory/bulk/delete - Bulk delete inventory items
  async bulkDeleteItems(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
        return;
      }

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          error: 'IDs array is required and must not be empty',
        });
        return;
      }

      if (ids.length > 50) {
        res.status(400).json({
          success: false,
          error: 'Maximum 50 items can be deleted in a single bulk operation',
        });
        return;
      }

      // Validate IDs
      const invalidIds = ids.filter(id => !id || typeof id !== 'string');
      if (invalidIds.length > 0) {
        res.status(400).json({
          success: false,
          error: 'All IDs must be valid strings',
        });
        return;
      }

      // Perform bulk delete in transaction
      const deletedCount = await this.prisma.$transaction(async (tx) => {
        // First, delete related inventory actions
        await tx.inventoryAction.deleteMany({
          where: { itemId: { in: ids } },
        });

        // Then delete the inventory items
        const result = await tx.inventoryItem.deleteMany({
          where: { id: { in: ids } },
        });

        return result.count;
      });

      const response: ApiResponse<{ deletedCount: number }> = {
        success: true,
        data: { deletedCount },
        message: `Successfully deleted ${deletedCount} items`,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to perform bulk delete',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}