import { PrismaClient, InventoryItem } from '@prisma/client';
import { InventoryItemRepository } from '../repositories/inventory-item.repository';

export interface LowStockAlert {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  location: string;
  category: string;
  severity: 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';
  createdAt: Date;
}

export class AlertService {
  private inventoryRepository: InventoryItemRepository;

  constructor(private prisma: PrismaClient) {
    this.inventoryRepository = new InventoryItemRepository(prisma);
  }

  // Generate low stock alerts
  async generateLowStockAlerts(): Promise<LowStockAlert[]> {
    try {
      const lowStockItems = await this.inventoryRepository.findLowStockItems();
      
      const alerts: LowStockAlert[] = lowStockItems.map(item => ({
        id: `alert_${item.id}_${Date.now()}`,
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        currentStock: item.stockLevel,
        minStock: item.minStock,
        location: item.location,
        category: item.category,
        severity: this.calculateSeverity(item),
        createdAt: new Date(),
      }));

      return alerts;
    } catch (error) {
      console.error('Error generating low stock alerts:', error);
      throw new Error('Failed to generate low stock alerts');
    }
  }

  // Calculate alert severity based on stock levels
  private calculateSeverity(item: InventoryItem): 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK' {
    if (item.stockLevel === 0) {
      return 'OUT_OF_STOCK';
    }
    
    const stockRatio = item.stockLevel / item.minStock;
    
    if (stockRatio <= 0.25) { // 25% or less of minimum stock
      return 'CRITICAL';
    }
    
    return 'LOW';
  }

  // Get current low stock alerts
  async getCurrentAlerts(): Promise<LowStockAlert[]> {
    return this.generateLowStockAlerts();
  }

  // Get alerts by severity
  async getAlertsBySeverity(severity: 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK'): Promise<LowStockAlert[]> {
    const allAlerts = await this.generateLowStockAlerts();
    return allAlerts.filter(alert => alert.severity === severity);
  }

  // Get alerts by category
  async getAlertsByCategory(category: string): Promise<LowStockAlert[]> {
    const allAlerts = await this.generateLowStockAlerts();
    return allAlerts.filter(alert => 
      alert.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  // Get alerts by location
  async getAlertsByLocation(location: string): Promise<LowStockAlert[]> {
    const allAlerts = await this.generateLowStockAlerts();
    return allAlerts.filter(alert => 
      alert.location.toLowerCase().includes(location.toLowerCase())
    );
  }

  // Get alert statistics
  async getAlertStatistics(): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    byLocation: Record<string, number>;
  }> {
    try {
      const alerts = await this.generateLowStockAlerts();
      
      const bySeverity: Record<string, number> = {
        LOW: 0,
        CRITICAL: 0,
        OUT_OF_STOCK: 0,
      };

      const byCategory: Record<string, number> = {};
      const byLocation: Record<string, number> = {};

      alerts.forEach(alert => {
        // Count by severity
        bySeverity[alert.severity]++;

        // Count by category
        byCategory[alert.category] = (byCategory[alert.category] || 0) + 1;

        // Count by location
        byLocation[alert.location] = (byLocation[alert.location] || 0) + 1;
      });

      return {
        total: alerts.length,
        bySeverity,
        byCategory,
        byLocation,
      };
    } catch (error) {
      console.error('Error getting alert statistics:', error);
      throw new Error('Failed to get alert statistics');
    }
  }

  // Check if an item should trigger an alert
  async shouldTriggerAlert(itemId: string): Promise<boolean> {
    try {
      const item = await this.inventoryRepository.findById(itemId);
      return item.stockLevel <= item.minStock;
    } catch (error) {
      console.error('Error checking alert trigger:', error);
      return false;
    }
  }

  // Monitor stock levels and return items that need attention
  async monitorStockLevels(): Promise<{
    lowStock: InventoryItem[];
    critical: InventoryItem[];
    outOfStock: InventoryItem[];
  }> {
    try {
      const lowStockItems = await this.inventoryRepository.findLowStockItems();
      
      const lowStock: InventoryItem[] = [];
      const critical: InventoryItem[] = [];
      const outOfStock: InventoryItem[] = [];

      lowStockItems.forEach(item => {
        if (item.stockLevel === 0) {
          outOfStock.push(item);
        } else if (item.stockLevel <= item.minStock * 0.25) {
          critical.push(item);
        } else {
          lowStock.push(item);
        }
      });

      return { lowStock, critical, outOfStock };
    } catch (error) {
      console.error('Error monitoring stock levels:', error);
      throw new Error('Failed to monitor stock levels');
    }
  }
}