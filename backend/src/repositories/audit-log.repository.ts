import { PrismaClient, AuditLog } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { PaginationOptions } from '../types';

export interface CreateAuditLogData {
  action: string;
  resourceType: string;
  resourceId: string;
  changes?: any;
  userId: string;
}

export class AuditLogRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async create(data: CreateAuditLogData): Promise<AuditLog> {
    try {
      return await this.prisma.auditLog.create({
        data: {
          action: data.action,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          changes: data.changes,
          userId: data.userId,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, 'create audit log');
    }
  }

  async findAll(pagination: PaginationOptions = {}): Promise<{
    logs: AuditLog[];
    total: number;
  }> {
    try {
      const { page = 1, limit = 50 } = pagination;
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        this.prisma.auditLog.count(),
      ]);

      return { logs, total };
    } catch (error) {
      this.handleDatabaseError(error, 'find all audit logs');
    }
  }

  async findByUserId(
    userId: string, 
    pagination: PaginationOptions = {}
  ): Promise<{
    logs: AuditLog[];
    total: number;
  }> {
    try {
      const { page = 1, limit = 50 } = pagination;
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        this.prisma.auditLog.count({ where: { userId } }),
      ]);

      return { logs, total };
    } catch (error) {
      this.handleDatabaseError(error, 'find audit logs by user');
    }
  }

  async findByResourceType(
    resourceType: string, 
    pagination: PaginationOptions = {}
  ): Promise<{
    logs: AuditLog[];
    total: number;
  }> {
    try {
      const { page = 1, limit = 50 } = pagination;
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where: { resourceType },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        this.prisma.auditLog.count({ where: { resourceType } }),
      ]);

      return { logs, total };
    } catch (error) {
      this.handleDatabaseError(error, 'find audit logs by resource type');
    }
  }

  async findByResourceId(
    resourceId: string, 
    pagination: PaginationOptions = {}
  ): Promise<{
    logs: AuditLog[];
    total: number;
  }> {
    try {
      const { page = 1, limit = 50 } = pagination;
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where: { resourceId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        this.prisma.auditLog.count({ where: { resourceId } }),
      ]);

      return { logs, total };
    } catch (error) {
      this.handleDatabaseError(error, 'find audit logs by resource ID');
    }
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    pagination: PaginationOptions = {}
  ): Promise<{
    logs: AuditLog[];
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

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      return { logs, total };
    } catch (error) {
      this.handleDatabaseError(error, 'find audit logs by date range');
    }
  }

  async deleteOldLogs(olderThanDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      return result.count;
    } catch (error) {
      this.handleDatabaseError(error, 'delete old audit logs');
    }
  }
}