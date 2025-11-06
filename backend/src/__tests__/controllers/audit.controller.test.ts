import { Request, Response } from 'express';
import { AuditController } from '../../controllers/audit.controller';
import { mockPrismaClient } from '../setup';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../../types';

// Extend Express Request interface to include user for testing
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

describe('AuditController', () => {
    let auditController: AuditController;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        auditController = new AuditController(mockPrismaClient);
        mockRequest = {
            body: {},
            params: {},
            query: {},
            user: { id: 'admin-id', role: 'ADMIN' as UserRole, email: 'admin@test.com', name: 'Admin User' },
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    describe('getAllAuditLogs', () => {
        it('should return paginated audit logs', async () => {
            mockRequest.query = { page: '1', limit: '10' };

            const mockLogs = [
                {
                    id: 'log1',
                    action: 'CREATE_USER',
                    resourceType: 'User',
                    resourceId: 'user1',
                    changes: { name: 'Test User' },
                    createdAt: new Date(),
                    userId: 'admin-id',
                    user: { name: 'Admin', email: 'admin@test.com' },
                },
            ];

            mockPrismaClient.auditLog.findMany = jest.fn().mockResolvedValue(mockLogs);
            mockPrismaClient.auditLog.count = jest.fn().mockResolvedValue(1);

            await auditController.getAllAuditLogs(mockRequest as Request, mockResponse as Response);

            expect(mockPrismaClient.auditLog.findMany).toHaveBeenCalledWith({
                include: { user: { select: { id: true, name: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                skip: 0,
                take: 10,
            });
            expect(mockPrismaClient.auditLog.count).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockLogs,
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 1,
                    totalPages: 1,
                },
            });
        });

        it('should use default pagination when not provided', async () => {
            mockRequest.query = {};

            const mockLogs: any[] = [];
            mockPrismaClient.auditLog.findMany = jest.fn().mockResolvedValue(mockLogs);
            mockPrismaClient.auditLog.count = jest.fn().mockResolvedValue(0);

            await auditController.getAllAuditLogs(mockRequest as Request, mockResponse as Response);

            expect(mockPrismaClient.auditLog.findMany).toHaveBeenCalledWith({
                include: { user: { select: { id: true, name: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                skip: 0,
                take: 50, // default limit
            });
        });

        it('should handle database errors', async () => {
            mockPrismaClient.auditLog.findMany = jest.fn().mockRejectedValue(new Error('Database error'));

            await auditController.getAllAuditLogs(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Database operation failed: find all audit logs',
            });
        });
    });

    describe('getAuditLogsByUser', () => {
        it('should return audit logs for specific user', async () => {
            mockRequest.params = { userId: 'user-id' };
            mockRequest.query = { page: '1', limit: '20' };

            const mockLogs = [
                {
                    id: 'log1',
                    action: 'UPDATE_INVENTORY',
                    resourceType: 'InventoryItem',
                    resourceId: 'item1',
                    changes: { stockLevel: 100 },
                    createdAt: new Date(),
                    userId: 'user-id',
                    user: { name: 'User', email: 'user@test.com' },
                },
            ];

            mockPrismaClient.auditLog.findMany = jest.fn().mockResolvedValue(mockLogs);
            mockPrismaClient.auditLog.count = jest.fn().mockResolvedValue(1);

            await auditController.getAuditLogsByUser(mockRequest as Request, mockResponse as Response);

            expect(mockPrismaClient.auditLog.findMany).toHaveBeenCalledWith({
                where: { userId: 'user-id' },
                include: { user: { select: { id: true, name: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                skip: 0,
                take: 20,
            });
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('getAuditLogsByResourceType', () => {
        it('should return audit logs for specific resource type', async () => {
            mockRequest.params = { resourceType: 'User' };

            const mockLogs = [
                {
                    id: 'log1',
                    action: 'CREATE_USER',
                    resourceType: 'User',
                    resourceId: 'user1',
                    changes: { name: 'New User' },
                    createdAt: new Date(),
                    userId: 'admin-id',
                    user: { name: 'Admin', email: 'admin@test.com' },
                },
            ];

            mockPrismaClient.auditLog.findMany = jest.fn().mockResolvedValue(mockLogs);
            mockPrismaClient.auditLog.count = jest.fn().mockResolvedValue(1);

            await auditController.getAuditLogsByResourceType(mockRequest as Request, mockResponse as Response);

            expect(mockPrismaClient.auditLog.findMany).toHaveBeenCalledWith({
                where: { resourceType: 'User' },
                include: { user: { select: { id: true, name: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                skip: 0,
                take: 50,
            });
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('getAuditLogsByResourceId', () => {
        it('should return audit logs for specific resource ID', async () => {
            mockRequest.params = { resourceId: 'resource-123' };

            const mockLogs = [
                {
                    id: 'log1',
                    action: 'UPDATE_INVENTORY',
                    resourceType: 'InventoryItem',
                    resourceId: 'resource-123',
                    changes: { stockLevel: 50 },
                    createdAt: new Date(),
                    userId: 'user-id',
                    user: { name: 'User', email: 'user@test.com' },
                },
            ];

            mockPrismaClient.auditLog.findMany = jest.fn().mockResolvedValue(mockLogs);
            mockPrismaClient.auditLog.count = jest.fn().mockResolvedValue(1);

            await auditController.getAuditLogsByResourceId(mockRequest as Request, mockResponse as Response);

            expect(mockPrismaClient.auditLog.findMany).toHaveBeenCalledWith({
                where: { resourceId: 'resource-123' },
                include: { user: { select: { id: true, name: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                skip: 0,
                take: 50,
            });
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('getAuditLogsByDateRange', () => {
        it('should return audit logs within date range', async () => {
            mockRequest.query = {
                startDate: '2023-01-01',
                endDate: '2023-12-31',
                page: '1',
                limit: '25',
            };

            const mockLogs = [
                {
                    id: 'log1',
                    action: 'DELETE_USER',
                    resourceType: 'User',
                    resourceId: 'user1',
                    changes: { deletedUserId: 'user1' },
                    createdAt: new Date('2023-06-15'),
                    userId: 'admin-id',
                    user: { name: 'Admin', email: 'admin@test.com' },
                },
            ];

            mockPrismaClient.auditLog.findMany = jest.fn().mockResolvedValue(mockLogs);
            mockPrismaClient.auditLog.count = jest.fn().mockResolvedValue(1);

            await auditController.getAuditLogsByDateRange(mockRequest as Request, mockResponse as Response);

            expect(mockPrismaClient.auditLog.findMany).toHaveBeenCalledWith({
                where: {
                    createdAt: {
                        gte: new Date('2023-01-01'),
                        lte: new Date('2023-12-31'),
                    },
                },
                include: { user: { select: { id: true, name: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                skip: 0,
                take: 25,
            });
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it('should return 400 for invalid date format', async () => {
            mockRequest.query = {
                startDate: 'invalid-date',
                endDate: '2023-12-31',
            };

            await auditController.getAuditLogsByDateRange(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)',
            });
        });

        it('should return 400 when start date is after end date', async () => {
            mockRequest.query = {
                startDate: '2023-12-31',
                endDate: '2023-01-01',
            };

            await auditController.getAuditLogsByDateRange(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Start date must be before end date',
            });
        });
    });

    describe('deleteOldAuditLogs', () => {
        it('should delete old audit logs successfully', async () => {
            mockRequest.body = { days: 30 };

            mockPrismaClient.auditLog.deleteMany = jest.fn().mockResolvedValue({ count: 5 });

            await auditController.deleteOldAuditLogs(mockRequest as Request, mockResponse as Response);

            expect(mockPrismaClient.auditLog.deleteMany).toHaveBeenCalledWith({
                where: {
                    createdAt: {
                        lt: expect.any(Date),
                    },
                },
            });
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: { deletedCount: 5 },
                message: 'Deleted 5 audit logs older than 30 days',
            });
        });

        it('should use default 90 days when not specified', async () => {
            mockRequest.body = {};

            mockPrismaClient.auditLog.deleteMany = jest.fn().mockResolvedValue({ count: 10 });

            await auditController.deleteOldAuditLogs(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: { deletedCount: 10 },
                message: 'Deleted 10 audit logs older than 90 days',
            });
        });

        it('should return 400 for invalid days value', async () => {
            mockRequest.body = { days: -5 };

            await auditController.deleteOldAuditLogs(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Days must be a positive number',
            });
            expect(mockPrismaClient.auditLog.deleteMany).not.toHaveBeenCalled();
        });

        it('should handle database errors', async () => {
            mockRequest.body = { days: 60 };

            mockPrismaClient.auditLog.deleteMany = jest.fn().mockRejectedValue(new Error('Database error'));

            await auditController.deleteOldAuditLogs(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Database operation failed: delete old audit logs',
            });
        });
    });
});