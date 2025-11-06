import { InventoryItemRepository } from '../../repositories/inventory-item.repository';
import { NotFoundError } from '../../repositories/base.repository';
import { mockPrismaClient } from '../setup';

describe('InventoryItemRepository', () => {
  let inventoryRepository: InventoryItemRepository;

  beforeEach(() => {
    inventoryRepository = new InventoryItemRepository(mockPrismaClient);
  });

  describe('create', () => {
    it('should create an inventory item successfully', async () => {
      const itemData = {
        name: 'Test Item',
        description: 'Test Description',
        sku: 'TEST-001',
        category: 'Electronics',
        stockLevel: 10,
        minStock: 5,
        maxStock: 100,
        unitPrice: 99.99,
        location: 'Warehouse A',
      };

      const expectedItem = {
        id: 'item-123',
        ...itemData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.inventoryItem.create = jest.fn().mockResolvedValue(expectedItem);

      const result = await inventoryRepository.create(itemData);

      expect(mockPrismaClient.inventoryItem.create).toHaveBeenCalledWith({
        data: {
          name: itemData.name,
          description: itemData.description,
          sku: itemData.sku,
          category: itemData.category,
          stockLevel: itemData.stockLevel,
          minStock: itemData.minStock,
          maxStock: itemData.maxStock,
          unitPrice: itemData.unitPrice,
          location: itemData.location,
        },
      });
      expect(result).toEqual(expectedItem);
    });

    it('should create an inventory item with default values', async () => {
      const itemData = {
        name: 'Test Item',
        sku: 'TEST-001',
        category: 'Electronics',
        unitPrice: 99.99,
        location: 'Warehouse A',
      };

      const expectedItem = {
        id: 'item-123',
        ...itemData,
        description: undefined,
        stockLevel: 0,
        minStock: 0,
        maxStock: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.inventoryItem.create = jest.fn().mockResolvedValue(expectedItem);

      await inventoryRepository.create(itemData);

      expect(mockPrismaClient.inventoryItem.create).toHaveBeenCalledWith({
        data: {
          name: itemData.name,
          description: undefined,
          sku: itemData.sku,
          category: itemData.category,
          stockLevel: 0,
          minStock: 0,
          maxStock: undefined,
          unitPrice: itemData.unitPrice,
          location: itemData.location,
        },
      });
    });
  });

  describe('findById', () => {
    it('should find an inventory item by ID with actions', async () => {
      const itemId = 'item-123';
      const expectedItem = {
        id: itemId,
        name: 'Test Item',
        sku: 'TEST-001',
        category: 'Electronics',
        stockLevel: 10,
        minStock: 5,
        maxStock: 100,
        unitPrice: 99.99,
        location: 'Warehouse A',
        createdAt: new Date(),
        updatedAt: new Date(),
        actions: [
          {
            id: 'action-1',
            type: 'ADD_STOCK',
            quantity: 10,
            createdAt: new Date(),
            user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
          },
        ],
      };

      mockPrismaClient.inventoryItem.findUnique = jest.fn().mockResolvedValue(expectedItem);

      const result = await inventoryRepository.findById(itemId);

      expect(mockPrismaClient.inventoryItem.findUnique).toHaveBeenCalledWith({
        where: { id: itemId },
        include: {
          actions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });
      expect(result).toEqual(expectedItem);
    });

    it('should throw NotFoundError when item is not found', async () => {
      const itemId = 'nonexistent-item';

      mockPrismaClient.inventoryItem.findUnique = jest.fn().mockResolvedValue(null);

      await expect(inventoryRepository.findById(itemId)).rejects.toThrow(NotFoundError);
      await expect(inventoryRepository.findById(itemId)).rejects.toThrow('Inventory item with id nonexistent-item not found');
    });
  });

  describe('findBySku', () => {
    it('should find an inventory item by SKU', async () => {
      const sku = 'TEST-001';
      const expectedItem = {
        id: 'item-123',
        name: 'Test Item',
        sku,
        category: 'Electronics',
        stockLevel: 10,
        minStock: 5,
        unitPrice: 99.99,
        location: 'Warehouse A',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.inventoryItem.findUnique = jest.fn().mockResolvedValue(expectedItem);

      const result = await inventoryRepository.findBySku(sku);

      expect(mockPrismaClient.inventoryItem.findUnique).toHaveBeenCalledWith({
        where: { sku },
      });
      expect(result).toEqual(expectedItem);
    });

    it('should return null when item is not found by SKU', async () => {
      const sku = 'NONEXISTENT-001';

      mockPrismaClient.inventoryItem.findUnique = jest.fn().mockResolvedValue(null);

      const result = await inventoryRepository.findBySku(sku);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should find all inventory items with default pagination', async () => {
      const expectedItems = [
        {
          id: 'item-1',
          name: 'Item 1',
          sku: 'ITEM-001',
          category: 'Electronics',
          stockLevel: 10,
          minStock: 5,
          unitPrice: 99.99,
          location: 'Warehouse A',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaClient.inventoryItem.findMany = jest.fn().mockResolvedValue(expectedItems);
      mockPrismaClient.inventoryItem.count = jest.fn().mockResolvedValue(1);

      const result = await inventoryRepository.findAll();

      expect(mockPrismaClient.inventoryItem.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 50,
        orderBy: { updatedAt: 'desc' },
      });
      expect(mockPrismaClient.inventoryItem.count).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual({ items: expectedItems, total: 1 });
    });

    it('should find inventory items with search filter', async () => {
      const filter = { search: 'test' };
      const expectedItems = [
        {
          id: 'item-1',
          name: 'Test Item',
          sku: 'TEST-001',
          category: 'Electronics',
          stockLevel: 10,
          minStock: 5,
          unitPrice: 99.99,
          location: 'Warehouse A',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaClient.inventoryItem.findMany = jest.fn().mockResolvedValue(expectedItems);
      mockPrismaClient.inventoryItem.count = jest.fn().mockResolvedValue(1);

      const result = await inventoryRepository.findAll(filter);

      expect(mockPrismaClient.inventoryItem.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { sku: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 50,
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toEqual({ items: expectedItems, total: 1 });
    });

    it('should find inventory items with category filter', async () => {
      const filter = { category: 'Electronics' };
      const expectedItems = [
        {
          id: 'item-1',
          name: 'Test Item',
          sku: 'TEST-001',
          category: 'Electronics',
          stockLevel: 10,
          minStock: 5,
          unitPrice: 99.99,
          location: 'Warehouse A',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaClient.inventoryItem.findMany = jest.fn().mockResolvedValue(expectedItems);
      mockPrismaClient.inventoryItem.count = jest.fn().mockResolvedValue(1);

      const result = await inventoryRepository.findAll(filter);

      expect(mockPrismaClient.inventoryItem.findMany).toHaveBeenCalledWith({
        where: {
          category: { contains: 'Electronics', mode: 'insensitive' },
        },
        skip: 0,
        take: 50,
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toEqual({ items: expectedItems, total: 1 });
    });

    it('should handle low stock filter separately', async () => {
      const filter = { lowStock: true };
      const allItems = [
        {
          id: 'item-1',
          name: 'Low Stock Item',
          sku: 'LOW-001',
          category: 'Electronics',
          stockLevel: 2,
          minStock: 5,
          unitPrice: 99.99,
          location: 'Warehouse A',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'item-2',
          name: 'Normal Stock Item',
          sku: 'NORMAL-001',
          category: 'Electronics',
          stockLevel: 10,
          minStock: 5,
          unitPrice: 99.99,
          location: 'Warehouse A',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaClient.inventoryItem.findMany = jest.fn().mockResolvedValue(allItems);

      const result = await inventoryRepository.findAll(filter);

      expect(mockPrismaClient.inventoryItem.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { updatedAt: 'desc' },
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('item-1');
      expect(result.total).toBe(1);
    });
  });

  describe('updateStock', () => {
    it('should update stock level successfully', async () => {
      const itemId = 'item-123';
      const newStockLevel = 25;
      const expectedItem = {
        id: itemId,
        name: 'Test Item',
        sku: 'TEST-001',
        category: 'Electronics',
        stockLevel: newStockLevel,
        minStock: 5,
        unitPrice: 99.99,
        location: 'Warehouse A',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.inventoryItem.update = jest.fn().mockResolvedValue(expectedItem);

      const result = await inventoryRepository.updateStock(itemId, newStockLevel);

      expect(mockPrismaClient.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: itemId },
        data: { stockLevel: newStockLevel },
      });
      expect(result).toEqual(expectedItem);
    });
  });

  describe('bulkUpdateStock', () => {
    it('should perform bulk stock updates in a transaction', async () => {
      const updates = [
        { id: 'item-1', stockLevel: 10 },
        { id: 'item-2', stockLevel: 20 },
      ];

      mockPrismaClient.$transaction = jest.fn().mockResolvedValue([]);

      await inventoryRepository.bulkUpdateStock(updates);

      expect(mockPrismaClient.$transaction).toHaveBeenCalledWith([
        mockPrismaClient.inventoryItem.update({
          where: { id: 'item-1' },
          data: { stockLevel: 10 },
        }),
        mockPrismaClient.inventoryItem.update({
          where: { id: 'item-2' },
          data: { stockLevel: 20 },
        }),
      ]);
    });
  });

  describe('getCategories', () => {
    it('should return distinct categories', async () => {
      const expectedCategories = [
        { category: 'Electronics' },
        { category: 'Furniture' },
        { category: 'Office Supplies' },
      ];

      mockPrismaClient.inventoryItem.findMany = jest.fn().mockResolvedValue(expectedCategories);

      const result = await inventoryRepository.getCategories();

      expect(mockPrismaClient.inventoryItem.findMany).toHaveBeenCalledWith({
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      });
      expect(result).toEqual(['Electronics', 'Furniture', 'Office Supplies']);
    });
  });

  describe('getLocations', () => {
    it('should return distinct locations', async () => {
      const expectedLocations = [
        { location: 'Warehouse A' },
        { location: 'Warehouse B' },
        { location: 'Store Front' },
      ];

      mockPrismaClient.inventoryItem.findMany = jest.fn().mockResolvedValue(expectedLocations);

      const result = await inventoryRepository.getLocations();

      expect(mockPrismaClient.inventoryItem.findMany).toHaveBeenCalledWith({
        select: { location: true },
        distinct: ['location'],
        orderBy: { location: 'asc' },
      });
      expect(result).toEqual(['Warehouse A', 'Warehouse B', 'Store Front']);
    });
  });
});