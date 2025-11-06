import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ReportingController } from '../controllers/reporting.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

export function createReportingRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const reportingController = new ReportingController(prisma);
  const authMiddleware = new AuthMiddleware(prisma);

  // All reporting routes require authentication
  router.use(authMiddleware.authenticate);

  // Generate comprehensive inventory report
  // GET /api/reports/inventory?startDate=2023-01-01&endDate=2023-12-31&category=electronics&location=warehouse
  router.get('/inventory', reportingController.generateInventoryReport);

  // Get inventory metrics and KPIs for dashboard
  // GET /api/reports/metrics?startDate=2023-01-01&endDate=2023-12-31
  router.get('/metrics', reportingController.getInventoryMetrics);

  // Get comprehensive dashboard metrics with alerts, performance, and trends
  // GET /api/reports/dashboard?startDate=2023-01-01&endDate=2023-12-31
  router.get('/dashboard', reportingController.getDashboardMetrics);

  // Export inventory report in specified format
  // GET /api/reports/export/:format?startDate=2023-01-01&endDate=2023-12-31&category=electronics
  // Supported formats: csv, json, pdf
  router.get('/export/:format', reportingController.exportInventoryReport);

  return router;
}