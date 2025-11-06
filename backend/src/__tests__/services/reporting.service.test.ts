import { ReportingService } from '../../services/reporting.service';
import { ReportFilter } from '../../types';
import { ActionType } from '@prisma/client';

// Mock PrismaClient
const mockPrismaClient = {
  inventoryItem: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  inventoryAction: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
} as any;

describe('ReportingService', () => {
  let reportingService: ReportingService;

  const mockInventoryItems = [
    {
      id: '1',
      name: 'Test Item 1',
      sku: 'TEST001',
      category: 'Electronics',
      location: 'Warehouse A',
      stockLevel: 10,
      minStock: 5,
      unitPrice: 100.00,
      description: 'Test item 1',
      maxStock: 50,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    {
      id: '2',
      name: 'Test Item 2',
      sku: 'TEST002',
      category: 'Books',
      location: 'Warehouse B',
      stockLevel: 2,
      minStock: 5,
      unitPrice: 25.50,
      description: 'Test item 2',
      maxStock: 20,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
  ];

  const mockInventoryActions = [
    {
      id: '1',
      type: ActionType.ADD_STOCK,
      quantity: 10,
      notes: 'Initial stock',
      itemId: '1',
      userId: '1',
      createdAt: new Date('2023-01-01'),
      user: { name: 'Admin User' },
      item: { name: 'Test Item 1', sku: 'TEST001' },
    },
  ];

  const mockCategoryStats = [
    { category: 'Electronics', _count: { category: 1 }, _sum: { stockLevel: 10, unitPrice: 100.00 } },
    { category: 'Books', _count: { category: 1 }, _sum: { stockLevel: 2, unitPrice: 25.50 } },
  ];

  beforeEach(() => {
    reportingService = new ReportingService(mockPrismaClient);
    jest.clearAllMocks();
  });

  describe('generateInventoryReport', () => {
    it('should generate a complete inventory report', async () => {
      mockPrismaClient.inventoryItem.findMany.mockResolvedValue(mockInventoryItems);
      mockPrismaClient.inventoryAction.findMany.mockResolvedValue(mockInventoryActions);
      mockPrismaClient.inventoryItem.groupBy
        .mockResolvedValueOnce(mockCategoryStats)
        .mockResolvedValueOnce(mockCategoryStats);

      const result = await reportingService.generateInventoryReport();

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('actions');
      
      expect(result.summary.totalItems).toBe(2);
      expect(result.summary.totalValue).toBe(1051); // (10 * 100) + (2 * 25.5)
      expect(result.summary.lowStockItems).toBe(1); // Item 2 is below min stock
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].status).toBe('normal');
      expect(result.items[1].status).toBe('low_stock');
      
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe(ActionType.ADD_STOCK);
    });

    it('should apply filters correctly', async () => {
      mockPrismaClient.inventoryItem.findMany.mockResolvedValue([mockInventoryItems[0]]);
      mockPrismaClient.inventoryAction.findMany.mockResolvedValue([]);
      mockPrismaClient.inventoryItem.groupBy
        .mockResolvedValueOnce([mockCategoryStats[0]])
        .mockResolvedValueOnce([mockCategoryStats[0]]);

      const filter: ReportFilter = { category: 'Electronics' };
      const result = await reportingService.generateInventoryReport(filter);

      expect(mockPrismaClient.inventoryItem.findMany).toHaveBeenCalledWith({
        where: { category: { contains: 'Electronics', mode: 'insensitive' } },
        orderBy: { name: 'asc' },
      });
      expect(result.summary.totalItems).toBe(1);
    });

    it('should handle empty inventory', async () => {
      mockPrismaClient.inventoryItem.findMany.mockResolvedValue([]);
      mockPrismaClient.inventoryAction.findMany.mockResolvedValue([]);
      mockPrismaClient.inventoryItem.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await reportingService.generateInventoryReport();

      expect(result.summary.totalItems).toBe(0);
      expect(result.summary.totalValue).toBe(0);
      expect(result.items).toHaveLength(0);
      expect(result.actions).toHaveLength(0);
    });
  });

  describe('calculateInventoryMetrics', () => {
    it('should calculate basic metrics', async () => {
      mockPrismaClient.inventoryItem.findMany.mockResolvedValue(mockInventoryItems);
      mockPrismaClient.inventoryAction.count.mockResolvedValue(5);
      mockPrismaClient.inventoryItem.groupBy
        .mockResolvedValueOnce(mockCategoryStats)
        .mockResolvedValueOnce(mockCategoryStats);
      mockPrismaClient.inventoryAction.findMany.mockResolvedValue([]);

      const result = await reportingService.calculateInventoryMetrics();

      expect(result.totalItems).toBe(2);
      expect(result.totalValue).toBe(1051);
      expect(result.lowStockCount).toBe(1);
      expect(result.outOfStockCount).toBe(0);
      expect(result.topCategories).toHaveLength(2);
      expect(result.topLocations).toHaveLength(2);
    });
  });

  describe('calculateDashboardMetrics', () => {
    it('should calculate dashboard metrics', async () => {
      mockPrismaClient.inventoryItem.findMany.mockResolvedValue(mockInventoryItems);
      mockPrismaClient.inventoryAction.findMany.mockResolvedValue(mockInventoryActions);
      mockPrismaClient.inventoryItem.groupBy
        .mockResolvedValueOnce(mockCategoryStats)
        .mockResolvedValueOnce(mockCategoryStats);

      const result = await reportingService.calculateDashboardMetrics();

      expect(result.overview.totalItems).toBe(2);
      expect(result.overview.totalValue).toBe(1051);
      expect(result.alerts.warningAlerts).toBe(1);
      expect(result.performance.stockTurnover).toBe(1);
      expect(result.performance.averageStockLevel).toBe(6); // (10 + 2) / 2
    });
  });

  describe('error handling', () => {
    it('should handle database errors', async () => {
      mockPrismaClient.inventoryItem.findMany.mockRejectedValue(new Error('Database error'));

      await expect(reportingService.generateInventoryReport()).rejects.toThrow('Database error');
    });
  });
});