import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuditLogRepository } from '../repositories/audit-log.repository';

export class AuditMiddleware {
  private auditLogRepository: AuditLogRepository;

  constructor(prisma: PrismaClient) {
    this.auditLogRepository = new AuditLogRepository(prisma);
  }

  // Middleware to log admin actions
  logAdminAction = (action: string, resourceType: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Store original res.json to capture response data
      const originalJson = res.json.bind(res);
      let responseData: any;

      // Override res.json to capture response
      res.json = (data: any) => {
        responseData = data;
        return originalJson(data);
      };

      // Store original res.end to log after response
      const originalEnd = res.end.bind(res);
      const auditLogRepository = this.auditLogRepository;

      res.end = function (chunk?: any, encoding?: BufferEncoding | (() => void), cb?: () => void) {
        // Handle different overloads of res.end
        const callback = typeof encoding === 'function' ? encoding : cb;
        const actualEncoding = typeof encoding === 'string' ? encoding : undefined;

        // Log audit after response is sent
        setImmediate(async () => {
          try {
            // Only log if user is authenticated and is admin
            if (req.user && req.user.role === 'ADMIN') {
              const resourceId = req.params.id || req.params.userId || req.params.resourceId || 'unknown';
              
              // Prepare changes data based on request method
              let changes: any = {};
              
              if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
                changes = {
                  method: req.method,
                  requestBody: req.body,
                  responseData: responseData?.success ? responseData.data : null,
                  statusCode: res.statusCode,
                };
              } else if (req.method === 'DELETE') {
                changes = {
                  method: req.method,
                  deletedResourceId: resourceId,
                  statusCode: res.statusCode,
                };
              } else {
                changes = {
                  method: req.method,
                  statusCode: res.statusCode,
                };
              }

              // Only log successful operations (2xx status codes)
              if (res.statusCode >= 200 && res.statusCode < 300) {
                await auditLogRepository.create({
                  action,
                  resourceType,
                  resourceId,
                  changes,
                  userId: req.user.id,
                });
              }
            }
          } catch (error) {
            // Log audit error but don't fail the request
            console.error('Audit logging error:', error);
          }
        });

        // Call original end method with proper arguments
        if (chunk !== undefined) {
          if (actualEncoding) {
            return originalEnd(chunk, actualEncoding, callback);
          } else {
            return originalEnd(chunk, callback);
          }
        } else {
          return originalEnd(callback);
        }
      };

      next();
    };
  };

  // Middleware specifically for user management actions
  logUserManagement = (action: string) => {
    return this.logAdminAction(action, 'User');
  };

  // Middleware specifically for inventory management actions
  logInventoryManagement = (action: string) => {
    return this.logAdminAction(action, 'InventoryItem');
  };

  // Middleware specifically for system configuration actions
  logSystemConfiguration = (action: string) => {
    return this.logAdminAction(action, 'System');
  };
}