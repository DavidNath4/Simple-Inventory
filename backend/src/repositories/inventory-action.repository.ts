import { PrismaClient, InventoryAction, ActionType } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { CreateInventoryActionRequest, PaginationOptions } from '../types';

export class InventoryActionRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async create(data: CreateInventoryActionRequest, userId: string): Promise<InventoryAction> {
    try {
      return await this.prisma.inventoryAction.create({
        data: {
          type: data.type,
          quantity: data.quantity,
          notes: data.notes,
          userId,
          itemId: data.itemId,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          item: {
            select: { id: true, name: true, sku: true },
          },
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, 'create inventory action');
    }
  }

  async findByItemId(
    itemId: string, 
    pagination: PaginationOptions = {}
  ): Promise<{
    actions: InventoryAction[];
    total: number;
  }> {
    try {
      const { page = 1, limit = 50 } = pagination;
      const skip = (page - 1) * limit;

      const [actions, total] = await Promise.all([
        this.prisma.inventoryAction.findMany({
          where: { itemId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        this.prisma.inventoryAction.count({ where: { itemId } }),
      ]);

      return { actions, total };
    } catch (error) {
      this.handleDatabaseError(error, 'find inventory actions by item');
    }
  }

  async findByUserId(
    userId: string, 
    pagination: PaginationOptions = {}
  ): Promise<{
    actions: InventoryAction[];
    total: number;
  }> {
    try {
      const { page = 1, limit = 50 } = pagination;
      const skip = (page - 1) * limit;

      const [actions, total] = await Promise.all([
        this.prisma.inventoryAction.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            item: {
              select: { id: true, name: true, sku: true },
            },
          },
        }),
        this.prisma.inventoryAction.count({ where: { userId } }),
      ]);

      return { actions, total };
    } catch (error) {
      this.handleDatabaseError(error, 'find inventory actions by user');
    }
  }

  async findAll(pagination: PaginationOptions = {}): Promise<{
    actions: InventoryAction[];
    total: number;
  }> {
    try {
      const { page = 1, limit = 50 } = pagination;
      const skip = (page - 1) * limit;

      const [actions, total] = await Promise.all([
        this.prisma.inventoryAction.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            item: {
              select: { id: true, name: true, sku: true },
            },
          },
        }),
        this.prisma.inventoryAction.count(),
      ]);

      return { actions, total };
    } catch (error) {
      this.handleDatabaseError(error, 'find all inventory actions');
    }
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    pagination: PaginationOptions = {}
  ): Promise<{
    actions: InventoryAction[];
    total: number;
  }> {
    try {
      const { page = 1, limit = 50 } = pagination;
      const skip = (page - 1) * limit;

      const where = {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      };

      const [actions, total] = await Promise.all([
        this.prisma.inventoryAction.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            item: {
              select: { id: true, name: true, sku: true },
            },
          },
        }),
        this.prisma.inventoryAction.count({ where }),
      ]);

      return { actions, total };
    } catch (error) {
      this.handleDatabaseError(error, 'find inventory actions by date range');
    }
  }

  async getActionSummary(itemId?: string): Promise<{
    totalActions: number;
    actionsByType: Record<ActionType, number>;
  }> {
    try {
      const where = itemId ? { itemId } : {};

      const [totalActions, actionsByType] = await Promise.all([
        this.prisma.inventoryAction.count({ where }),
        this.prisma.inventoryAction.groupBy({
          by: ['type'],
          where,
          _count: { type: true },
        }),
      ]);

      const summary: Record<ActionType, number> = {
        ADD_STOCK: 0,
        REMOVE_STOCK: 0,
        ADJUST_STOCK: 0,
        TRANSFER: 0,
      };

      actionsByType.forEach(group => {
        summary[group.type] = group._count.type;
      });

      return { totalActions, actionsByType: summary };
    } catch (error) {
      this.handleDatabaseError(error, 'get action summary');
    }
  }
}