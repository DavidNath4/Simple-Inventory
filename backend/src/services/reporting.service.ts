import { PrismaClient } from '@prisma/client';
import { ReportFilter, InventoryReport, InventoryMetrics, DashboardMetrics, ActionType } from '../types';

export class ReportingService {
  constructor(private prisma: PrismaClient) {}

  async generateInventoryReport(filter: ReportFilter = {}): Promise<InventoryReport> {
    const { startDate, endDate, category, location, itemId } = filter;

    // Build where clause for items
    const itemWhere: any = {};
    if (category) itemWhere.category = { contains: category, mode: 'insensitive' };
    if (location) itemWhere.location = { contains: location, mode: 'insensitive' };
    if (itemId) itemWhere.id = itemId;

    // Build where clause for actions
    const actionWhere: any = {};
    if (startDate || endDate) {
      actionWhere.createdAt = {};
      if (startDate) actionWhere.createdAt.gte = new Date(startDate);
      if (endDate) actionWhere.createdAt.lte = new Date(endDate);
    }
    if (itemId) actionWhere.itemId = itemId;

    // Fetch data
    const [items, actions, categories, locations] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: itemWhere,
        orderBy: { name: 'asc' },
      }),
      this.prisma.inventoryAction.findMany({
        where: actionWhere,
        include: {
          user: { select: { name: true } },
          item: { select: { name: true, sku: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit recent actions
      }),
      this.prisma.inventoryItem.groupBy({
        by: ['category'],
        where: itemWhere,
        _count: { category: true },
      }),
      this.prisma.inventoryItem.groupBy({
        by: ['location'],
        where: itemWhere,
        _count: { location: true },
      }),
    ]);

    // Calculate summary
    const totalValue = items.reduce((sum, item) => 
      sum + (item.stockLevel * Number(item.unitPrice)), 0
    );
    const lowStockItems = items.filter(item => item.stockLevel <= item.minStock).length;

    const summary = {
      totalItems: items.length,
      totalValue,
      lowStockItems,
      categories: categories.length,
      locations: locations.length,
    };

    // Format items with status
    const formattedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      location: item.location,
      stockLevel: item.stockLevel,
      minStock: item.minStock,
      unitPrice: Number(item.unitPrice),
      totalValue: item.stockLevel * Number(item.unitPrice),
      status: item.stockLevel === 0 ? 'out_of_stock' as const :
               item.stockLevel <= item.minStock ? 'low_stock' as const : 'normal' as const,
    }));

    // Format actions
    const formattedActions = actions.map(action => ({
      id: action.id,
      type: action.type,
      quantity: action.quantity,
      itemName: action.item.name,
      itemSku: action.item.sku,
      userName: action.user.name,
      createdAt: action.createdAt,
    }));

    return {
      summary,
      items: formattedItems,
      actions: formattedActions,
    };
  }

  async calculateInventoryMetrics(filter: ReportFilter = {}): Promise<InventoryMetrics> {
    const { startDate, endDate, category, location } = filter;

    // Build where clauses
    const itemWhere: any = {};
    if (category) itemWhere.category = { contains: category, mode: 'insensitive' };
    if (location) itemWhere.location = { contains: location, mode: 'insensitive' };

    const actionWhere: any = {};
    if (startDate || endDate) {
      actionWhere.createdAt = {};
      if (startDate) actionWhere.createdAt.gte = new Date(startDate);
      if (endDate) actionWhere.createdAt.lte = new Date(endDate);
    }

    // Fetch basic metrics
    const [items, totalActions, categoryStats, locationStats] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: itemWhere,
      }),
      this.prisma.inventoryAction.count({ where: actionWhere }),
      this.prisma.inventoryItem.groupBy({
        by: ['category'],
        where: itemWhere,
        _count: { category: true },
        _sum: { stockLevel: true, unitPrice: true },
      }),
      this.prisma.inventoryItem.groupBy({
        by: ['location'],
        where: itemWhere,
        _count: { location: true },
        _sum: { stockLevel: true, unitPrice: true },
      }),
    ]);

    // Calculate basic metrics
    const totalValue = items.reduce((sum, item) => 
      sum + (item.stockLevel * Number(item.unitPrice)), 0
    );
    const lowStockCount = items.filter(item => item.stockLevel <= item.minStock).length;
    const outOfStockCount = items.filter(item => item.stockLevel === 0).length;

    // Format category stats
    const topCategories = categoryStats
      .map(stat => ({
        category: stat.category,
        itemCount: stat._count.category,
        totalValue: (stat._sum.stockLevel || 0) * Number(stat._sum.unitPrice || 0),
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    // Format location stats
    const topLocations = locationStats
      .map(stat => ({
        location: stat.location,
        itemCount: stat._count.location,
        totalValue: (stat._sum.stockLevel || 0) * Number(stat._sum.unitPrice || 0),
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    // Get recent actions grouped by date
    const recentActions = await this.getRecentActionTrends(actionWhere);
    const stockTrends = await this.getStockTrends(actionWhere);

    return {
      totalItems: items.length,
      totalValue,
      lowStockCount,
      outOfStockCount,
      topCategories,
      topLocations,
      recentActions,
      stockTrends,
    };
  }

  private async getRecentActionTrends(actionWhere: any) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const actions = await this.prisma.inventoryAction.findMany({
      where: {
        ...actionWhere,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        type: true,
        createdAt: true,
      },
    });

    // Group by date
    const actionsByDate = new Map<string, { count: number; types: Record<ActionType, number> }>();
    
    actions.forEach(action => {
      const date = action.createdAt.toISOString().split('T')[0];
      if (!actionsByDate.has(date)) {
        actionsByDate.set(date, {
          count: 0,
          types: { ADD_STOCK: 0, REMOVE_STOCK: 0, ADJUST_STOCK: 0, TRANSFER: 0 },
        });
      }
      const dayData = actionsByDate.get(date)!;
      dayData.count++;
      dayData.types[action.type]++;
    });

    return Array.from(actionsByDate.entries())
      .map(([date, data]) => ({
        date,
        actionCount: data.count,
        actionsByType: data.types,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getStockTrends(actionWhere: any) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const actions = await this.prisma.inventoryAction.findMany({
      where: {
        ...actionWhere,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        type: true,
        quantity: true,
        createdAt: true,
      },
    });

    // Group by date and calculate stock movements
    const stockByDate = new Map<string, { totalStock: number; stockIn: number; stockOut: number }>();
    
    actions.forEach(action => {
      const date = action.createdAt.toISOString().split('T')[0];
      if (!stockByDate.has(date)) {
        stockByDate.set(date, { totalStock: 0, stockIn: 0, stockOut: 0 });
      }
      const dayData = stockByDate.get(date)!;
      
      if (action.type === 'ADD_STOCK') {
        dayData.stockIn += action.quantity;
        dayData.totalStock += action.quantity;
      } else if (action.type === 'REMOVE_STOCK') {
        dayData.stockOut += action.quantity;
        dayData.totalStock -= action.quantity;
      } else if (action.type === 'ADJUST_STOCK') {
        // For adjustments, we'll count positive as in, negative as out
        if (action.quantity > 0) {
          dayData.stockIn += action.quantity;
          dayData.totalStock += action.quantity;
        } else {
          dayData.stockOut += Math.abs(action.quantity);
          dayData.totalStock += action.quantity; // quantity is already negative
        }
      }
    });

    return Array.from(stockByDate.entries())
      .map(([date, data]) => ({
        date,
        totalStock: data.totalStock,
        stockIn: data.stockIn,
        stockOut: data.stockOut,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async calculateDashboardMetrics(filter: ReportFilter = {}): Promise<DashboardMetrics> {
    const { startDate, endDate, category, location } = filter;

    // Build where clauses
    const itemWhere: any = {};
    if (category) itemWhere.category = { contains: category, mode: 'insensitive' };
    if (location) itemWhere.location = { contains: location, mode: 'insensitive' };

    const actionWhere: any = {};
    if (startDate || endDate) {
      actionWhere.createdAt = {};
      if (startDate) actionWhere.createdAt.gte = new Date(startDate);
      if (endDate) actionWhere.createdAt.lte = new Date(endDate);
    }

    // Fetch all necessary data
    const [items, actions, categories, locations] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: itemWhere,
      }),
      this.prisma.inventoryAction.findMany({
        where: actionWhere,
        include: {
          item: { select: { name: true, sku: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryItem.groupBy({
        by: ['category'],
        where: itemWhere,
        _count: { category: true },
      }),
      this.prisma.inventoryItem.groupBy({
        by: ['location'],
        where: itemWhere,
        _count: { location: true },
      }),
    ]);

    // Calculate overview metrics
    const totalValue = items.reduce((sum, item) => 
      sum + (item.stockLevel * Number(item.unitPrice)), 0
    );
    const lowStockItems = items.filter(item => item.stockLevel <= item.minStock);
    const outOfStockItems = items.filter(item => item.stockLevel === 0);

    const overview = {
      totalItems: items.length,
      totalValue,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      totalCategories: categories.length,
      totalLocations: locations.length,
    };

    // Calculate alerts
    const recentAlerts = lowStockItems
      .map(item => ({
        id: item.id,
        itemName: item.name,
        itemSku: item.sku,
        currentStock: item.stockLevel,
        minStock: item.minStock,
        severity: (item.stockLevel === 0 ? 'critical' : 'warning') as 'critical' | 'warning',
        createdAt: item.updatedAt,
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    const alerts = {
      criticalAlerts: outOfStockItems.length,
      warningAlerts: lowStockItems.length - outOfStockItems.length,
      recentAlerts,
    };

    // Calculate performance metrics
    const totalMovements = actions.length;
    const averageStockLevel = items.length > 0 ? 
      items.reduce((sum, item) => sum + item.stockLevel, 0) / items.length : 0;

    // Calculate top moving items
    const itemMovements = new Map<string, { item: any; movements: number; netMovement: number }>();
    actions.forEach(action => {
      const key = action.itemId;
      if (!itemMovements.has(key)) {
        itemMovements.set(key, {
          item: action.item,
          movements: 0,
          netMovement: 0,
        });
      }
      const data = itemMovements.get(key)!;
      data.movements++;
      
      if (action.type === 'ADD_STOCK') {
        data.netMovement += action.quantity;
      } else if (action.type === 'REMOVE_STOCK') {
        data.netMovement -= action.quantity;
      } else if (action.type === 'ADJUST_STOCK') {
        data.netMovement += action.quantity;
      }
    });

    const topMovingItems = Array.from(itemMovements.entries())
      .map(([itemId, data]) => ({
        id: itemId,
        name: data.item.name,
        sku: data.item.sku,
        totalMovements: data.movements,
        netMovement: data.netMovement,
      }))
      .sort((a, b) => b.totalMovements - a.totalMovements)
      .slice(0, 10);

    const performance = {
      stockTurnover: totalMovements,
      averageStockLevel,
      stockAccuracy: 95.0, // This would be calculated based on actual vs recorded stock
      topMovingItems,
    };

    // Calculate trends
    const stockMovements = await this.getStockMovementTrends(actionWhere);
    const valueChanges = await this.getValueChangeTrends(itemWhere, actionWhere);

    const trends = {
      stockMovements,
      valueChanges,
    };

    return {
      overview,
      alerts,
      performance,
      trends,
    };
  }

  private async getStockMovementTrends(actionWhere: any) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const actions = await this.prisma.inventoryAction.findMany({
      where: {
        ...actionWhere,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        type: true,
        quantity: true,
        createdAt: true,
      },
    });

    // Group by date
    const movementsByDate = new Map<string, { stockIn: number; stockOut: number }>();
    
    actions.forEach(action => {
      const date = action.createdAt.toISOString().split('T')[0];
      if (!movementsByDate.has(date)) {
        movementsByDate.set(date, { stockIn: 0, stockOut: 0 });
      }
      const dayData = movementsByDate.get(date)!;
      
      if (action.type === 'ADD_STOCK') {
        dayData.stockIn += action.quantity;
      } else if (action.type === 'REMOVE_STOCK') {
        dayData.stockOut += action.quantity;
      } else if (action.type === 'ADJUST_STOCK') {
        if (action.quantity > 0) {
          dayData.stockIn += action.quantity;
        } else {
          dayData.stockOut += Math.abs(action.quantity);
        }
      }
    });

    return Array.from(movementsByDate.entries())
      .map(([date, data]) => ({
        date,
        stockIn: data.stockIn,
        stockOut: data.stockOut,
        netChange: data.stockIn - data.stockOut,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getValueChangeTrends(itemWhere: any, actionWhere: any) {
    // This is a simplified calculation - in a real system, you'd track historical values
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const items = await this.prisma.inventoryItem.findMany({
      where: itemWhere,
    });

    const currentTotalValue = items.reduce((sum, item) => 
      sum + (item.stockLevel * Number(item.unitPrice)), 0
    );

    // Generate sample trend data (in a real system, this would be historical data)
    const trends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Simulate value changes (in reality, you'd calculate from historical data)
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      const dayValue = currentTotalValue * (1 + variation);
      const previousValue: number = i === 29 ? dayValue : trends[trends.length - 1]?.totalValue || dayValue;
      
      trends.push({
        date: dateStr,
        totalValue: dayValue,
        valueChange: dayValue - previousValue,
      });
    }

    return trends;
  }
}