import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { ApiResponse, PaginatedResponse, PaginationOptions } from '../types';

export class AuditController {
  private auditLogRepository: AuditLogRepository;

  constructor(prisma: PrismaClient) {
    this.auditLogRepository = new AuditLogRepository(prisma);
  }

  // Get all audit logs (Admin only)
  getAllAuditLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const pagination: PaginationOptions = { page, limit };

      const { logs, total } = await this.auditLogRepository.findAll(pagination);

      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      } as ApiResponse<typeof logs> & { pagination: any });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get audit logs',
      } as ApiResponse<null>);
    }
  };

  // Get audit logs by user ID (Admin only)
  getAuditLogsByUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const pagination: PaginationOptions = { page, limit };

      const { logs, total } = await this.auditLogRepository.findByUserId(userId, pagination);

      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      } as ApiResponse<typeof logs> & { pagination: any });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get audit logs by user',
      } as ApiResponse<null>);
    }
  };

  // Get audit logs by resource type (Admin only)
  getAuditLogsByResourceType = async (req: Request, res: Response): Promise<void> => {
    try {
      const resourceType = req.params.resourceType;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const pagination: PaginationOptions = { page, limit };

      const { logs, total } = await this.auditLogRepository.findByResourceType(resourceType, pagination);

      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      } as ApiResponse<typeof logs> & { pagination: any });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get audit logs by resource type',
      } as ApiResponse<null>);
    }
  };

  // Get audit logs by resource ID (Admin only)
  getAuditLogsByResourceId = async (req: Request, res: Response): Promise<void> => {
    try {
      const resourceId = req.params.resourceId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const pagination: PaginationOptions = { page, limit };

      const { logs, total } = await this.auditLogRepository.findByResourceId(resourceId, pagination);

      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      } as ApiResponse<typeof logs> & { pagination: any });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get audit logs by resource ID',
      } as ApiResponse<null>);
    }
  };

  // Get audit logs by date range (Admin only)
  getAuditLogsByDateRange = async (req: Request, res: Response): Promise<void> => {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const pagination: PaginationOptions = { page, limit };

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)',
        } as ApiResponse<null>);
        return;
      }

      if (startDate > endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date must be before end date',
        } as ApiResponse<null>);
        return;
      }

      const { logs, total } = await this.auditLogRepository.findByDateRange(startDate, endDate, pagination);

      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      } as ApiResponse<typeof logs> & { pagination: any });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get audit logs by date range',
      } as ApiResponse<null>);
    }
  };

  // Delete old audit logs (Admin only)
  deleteOldAuditLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const days = parseInt(req.body.days) || 90; // Default to 90 days

      if (days < 1) {
        res.status(400).json({
          success: false,
          error: 'Days must be a positive number',
        } as ApiResponse<null>);
        return;
      }

      const deletedCount = await this.auditLogRepository.deleteOldLogs(days);

      res.status(200).json({
        success: true,
        data: { deletedCount },
        message: `Deleted ${deletedCount} audit logs older than ${days} days`,
      } as ApiResponse<{ deletedCount: number }>);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete old audit logs',
      } as ApiResponse<null>);
    }
  };
}