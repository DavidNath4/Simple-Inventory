import { Request, Response, NextFunction } from 'express';
import { AuditMiddleware } from '../../middleware/audit.middleware';
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

describe('AuditMiddleware', () => {
    let auditMiddleware: AuditMiddleware;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;
    let mockJson: jest.Mock;
    let mockEnd: jest.Mock;

    beforeEach(() => {
        auditMiddleware = new AuditMiddleware(mockPrismaClient);
        mockJson = jest.fn();
        mockEnd = jest.fn();

        mockRequest = {
            body: { name: 'Test User', email: 'test@test.com' },
            params: { id: 'resource-id' },
            method: 'POST',
            user: { id: 'admin-id', role: 'ADMIN' as UserRole, email: 'admin@test.com', name: 'Admin User' },
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: mockJson.mockReturnThis(),
            end: mockEnd,
            statusCode: 200,
        };

        mockNext = jest.fn();
    });

    describe('logAdminAction', () => {
        it('should log admin action for successful POST request', (done) => {
            const middleware = auditMiddleware.logAdminAction('CREATE_USER', 'User');

            mockPrismaClient.auditLog.create = jest.fn().mockResolvedValue({});

            // Execute middleware
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            // Simulate response
            mockResponse.json!({ success: true, data: { id: 'new-user-id' } });
            mockResponse.end!();

            // Use setImmediate to wait for async audit logging
            setImmediate(() => {
                expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith({
                    data: {
                        action: 'CREATE_USER',
                        resourceType: 'User',
                        resourceId: 'resource-id',
                        changes: {
                            method: 'POST',
                            requestBody: { name: 'Test User', email: 'test@test.com' },
                            responseData: { id: 'new-user-id' },
                            statusCode: 200,
                        },
                        userId: 'admin-id',
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                });
                done();
            });

            expect(mockNext).toHaveBeenCalled();
        });

        it('should log admin action for successful DELETE request', (done) => {
            mockRequest.method = 'DELETE';
            mockRequest.params = { id: 'user-to-delete' };

            const middleware = auditMiddleware.logAdminAction('DELETE_USER', 'User');

            mockPrismaClient.auditLog.create = jest.fn().mockResolvedValue({});

            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            mockResponse.json!({ success: true });
            mockResponse.end!();

            setImmediate(() => {
                expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith({
                    data: {
                        action: 'DELETE_USER',
                        resourceType: 'User',
                        resourceId: 'user-to-delete',
                        changes: {
                            method: 'DELETE',
                            deletedResourceId: 'user-to-delete',
                            statusCode: 200,
                        },
                        userId: 'admin-id',
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                });
                done();
            });
        });

        it('should log admin action for successful PUT request', (done) => {
            mockRequest.method = 'PUT';
            mockRequest.body = { name: 'Updated User' };

            const middleware = auditMiddleware.logAdminAction('UPDATE_USER', 'User');

            mockPrismaClient.auditLog.create = jest.fn().mockResolvedValue({});

            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            mockResponse.json!({ success: true, data: { id: 'resource-id', name: 'Updated User' } });
            mockResponse.end!();

            setImmediate(() => {
                expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith({
                    data: {
                        action: 'UPDATE_USER',
                        resourceType: 'User',
                        resourceId: 'resource-id',
                        changes: {
                            method: 'PUT',
                            requestBody: { name: 'Updated User' },
                            responseData: { id: 'resource-id', name: 'Updated User' },
                            statusCode: 200,
                        },
                        userId: 'admin-id',
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                });
                done();
            });
        });

        it('should not log for non-admin users', (done) => {
            mockRequest.user = { id: 'user-id', role: 'USER' as UserRole, email: 'user@test.com', name: 'Regular User' };

            const middleware = auditMiddleware.logAdminAction('CREATE_USER', 'User');

            mockPrismaClient.auditLog.create = jest.fn();

            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            mockResponse.json!({ success: true });
            mockResponse.end!();

            setImmediate(() => {
                expect(mockPrismaClient.auditLog.create).not.toHaveBeenCalled();
                done();
            });
        });

        it('should not log for unauthenticated requests', (done) => {
            mockRequest.user = undefined;

            const middleware = auditMiddleware.logAdminAction('CREATE_USER', 'User');

            mockPrismaClient.auditLog.create = jest.fn();

            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            mockResponse.json!({ success: true });
            mockResponse.end!();

            setImmediate(() => {
                expect(mockPrismaClient.auditLog.create).not.toHaveBeenCalled();
                done();
            });
        });

        it('should not log for failed requests (non-2xx status)', (done) => {
            mockResponse.statusCode = 400;

            const middleware = auditMiddleware.logAdminAction('CREATE_USER', 'User');

            mockPrismaClient.auditLog.create = jest.fn();

            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            mockResponse.json!({ success: false, error: 'Bad request' });
            mockResponse.end!();

            setImmediate(() => {
                expect(mockPrismaClient.auditLog.create).not.toHaveBeenCalled();
                done();
            });
        });

        it('should handle audit logging errors gracefully', (done) => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const middleware = auditMiddleware.logAdminAction('CREATE_USER', 'User');

            mockPrismaClient.auditLog.create = jest.fn().mockRejectedValue(new Error('Audit error'));

            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            mockResponse.json!({ success: true });
            mockResponse.end!();

            setImmediate(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Audit logging error:', expect.any(Error));
                consoleSpy.mockRestore();
                done();
            });
        });

        it('should handle GET requests', (done) => {
            mockRequest.method = 'GET';

            const middleware = auditMiddleware.logAdminAction('VIEW_USERS', 'User');

            mockPrismaClient.auditLog.create = jest.fn().mockResolvedValue({});

            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            mockResponse.json!({ success: true, data: [] });
            mockResponse.end!();

            setImmediate(() => {
                expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith({
                    data: {
                        action: 'VIEW_USERS',
                        resourceType: 'User',
                        resourceId: 'resource-id',
                        changes: {
                            method: 'GET',
                            statusCode: 200,
                        },
                        userId: 'admin-id',
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                });
                done();
            });
        });
    });

    describe('logUserManagement', () => {
        it('should create middleware for user management actions', () => {
            const middleware = auditMiddleware.logUserManagement('CREATE_USER');
            expect(typeof middleware).toBe('function');
        });
    });

    describe('logInventoryManagement', () => {
        it('should create middleware for inventory management actions', () => {
            const middleware = auditMiddleware.logInventoryManagement('UPDATE_INVENTORY');
            expect(typeof middleware).toBe('function');
        });
    });

    describe('logSystemConfiguration', () => {
        it('should create middleware for system configuration actions', () => {
            const middleware = auditMiddleware.logSystemConfiguration('VIEW_ADMIN_DASHBOARD');
            expect(typeof middleware).toBe('function');
        });
    });

    describe('resource ID extraction', () => {
        it('should extract resource ID from different param names', (done) => {
            mockRequest.params = { userId: 'user-123' };

            const middleware = auditMiddleware.logAdminAction('VIEW_USER', 'User');

            mockPrismaClient.auditLog.create = jest.fn().mockResolvedValue({});

            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            mockResponse.json!({ success: true });
            mockResponse.end!();

            setImmediate(() => {
                expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith({
                    data: expect.objectContaining({
                        resourceId: 'user-123',
                    }),
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                });
                done();
            });
        });

        it('should use "unknown" when no resource ID is found', (done) => {
            mockRequest.params = {};

            const middleware = auditMiddleware.logAdminAction('VIEW_DASHBOARD', 'System');

            mockPrismaClient.auditLog.create = jest.fn().mockResolvedValue({});

            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            mockResponse.json!({ success: true });
            mockResponse.end!();

            setImmediate(() => {
                expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith({
                    data: expect.objectContaining({
                        resourceId: 'unknown',
                    }),
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                });
                done();
            });
        });
    });
});