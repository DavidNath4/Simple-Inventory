import { PrismaClient, InventoryItem } from '@prisma/client';
import { BaseRepository, NotFoundError } from './base.repository';
import { CreateInventoryItemRequest, UpdateInventoryItemRequest, InventoryFilter, PaginationOptions } from '../types';

export class InventoryItemRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async create(data: CreateInventoryItemRequest): Promise<InventoryItem> {
    try {
      return await this.prisma.inventoryItem.create({
        data: {
          name: data.name,
          description: data.description,
          sku: data.sku,
          category: data.category,
          stockLevel: data.stockLevel || 0,
          minStock: data.minStock || 0,
          maxStock: data.maxStock,
          unitPrice: data.unitPrice,
          location: data.location,
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, 'create inventory item');
    }
  }

  async findById(id: string): Promise<InventoryItem> {
    try {
      const item = await this.prisma.inventoryItem.findUnique({
        where: { id },
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

      if (!item) {
        throw new NotFoundError('Inventory item', id);
      }

      return item;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.handleDatabaseError(error, 'find inventory item by id');
    }
  }

  async findBySku(sku: string): Promise<InventoryItem | null> {
    try {
      return await this.prisma.inventoryItem.findUnique({
        where: { sku },
      });
    } catch (error) {
      this.handleDatabaseError(error, 'find inventory item by SKU');
    }
  }

  async findAll(filter: InventoryFilter = {}, pagination: PaginationOptions = {}): Promise<{
    items: InventoryItem[];
    total: number;
  }> {
    try {
      const { page = 1, limit = 50 } = pagination;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (filter.category) {
        where.category = { contains: filter.category, mode: 'insensitive' };
      }

      if (filter.location) {
        where.location = { contains: filter.location, mode: 'insensitive' };
      }

      if (filter.search) {
        where.OR = [
          { name: { contains: filter.search, mode: 'insensitive' } },
          { sku: { contains: filter.search, mode: 'insensitive' } },
          { description: { contains: filter.search, mode: 'insensitive' } },
        ];
      }

      // Note: Low stock filter will be handled separately due to field comparison complexity

      let items: InventoryItem[];
      let total: number;

      if (filter.lowStock) {
        // For low stock, we need to filter after fetching due to field comparison
        const allItems = await this.prisma.inventoryItem.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
        });
        
        const lowStockItems = allItems.filter(item => item.stockLevel <= item.minStock);
        total = lowStockItems.length;
        items = lowStockItems.slice(skip, skip + limit);
      } else {
        [items, total] = await Promise.all([
          this.prisma.inventoryItem.findMany({
            where,
            skip,
            take: limit,
            orderBy: { updatedAt: 'desc' },
          }),
          this.prisma.inventoryItem.count({ where }),
        ]);
      }

      return { items, total };
    } catch (error) {
      this.handleDatabaseError(error, 'find inventory items');
    }
  }

  async findLowStockItems(): Promise<InventoryItem[]> {
    try {
      const allItems = await this.prisma.inventoryItem.findMany({
        orderBy: { stockLevel: 'asc' },
      });
      
      return allItems.filter(item => item.stockLevel <= item.minStock);
    } catch (error) {
      this.handleDatabaseError(error, 'find low stock items');
    }
  }

  async update(id: string, data: UpdateInventoryItemRequest): Promise<InventoryItem> {
    try {
      return await this.prisma.inventoryItem.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.handleDatabaseError(error, 'update inventory item');
    }
  }

  async updateStock(id: string, newStockLevel: number): Promise<InventoryItem> {
    try {
      return await this.prisma.inventoryItem.update({
        where: { id },
        data: { stockLevel: newStockLevel },
      });
    } catch (error) {
      this.handleDatabaseError(error, 'update stock level');
    }
  }

  async bulkUpdateStock(updates: { id: string; stockLevel: number }[]): Promise<void> {
    try {
      await this.prisma.$transaction(
        updates.map(update =>
          this.prisma.inventoryItem.update({
            where: { id: update.id },
            data: { stockLevel: update.stockLevel },
          })
        )
      );
    } catch (error) {
      this.handleDatabaseError(error, 'bulk update stock levels');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.inventoryItem.delete({
        where: { id },
      });
    } catch (error) {
      this.handleDatabaseError(error, 'delete inventory item');
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const result = await this.prisma.inventoryItem.findMany({
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      });

      return result.map(item => item.category);
    } catch (error) {
      this.handleDatabaseError(error, 'get categories');
    }
  }

  async getLocations(): Promise<string[]> {
    try {
      const result = await this.prisma.inventoryItem.findMany({
        select: { location: true },
        distinct: ['location'],
        orderBy: { location: 'asc' },
      });

      return result.map(item => item.location);
    } catch (error) {
      this.handleDatabaseError(error, 'get locations');
    }
  }
}