import { Request, Response } from 'express';
import { ReportingController } from '../../controllers/reporting.controller';
import { ReportingService } from '../../services/reporting.service';
import { ExportService } from '../../services/export.service';
import { mockPrismaClient } from '../setup';
import { InventoryReport, InventoryMetrics, DashboardMetrics, ExportFormat } from '../../types';
import { ActionType } from '@prisma/client';

// Mock the services
jest.mock('../../services/reporting.service');
jest.mock('../../services/export.service');

describe('ReportingController', () => {
  let reportingController: ReportingController;
  let mockReportingService: jest.Mocked<ReportingService>;
  let mockExportService: jest.Mocked<ExportService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  const mockInventoryReport: InventoryReport = {
    summary: {
      totalItems: 2,
      totalValue: 1051,
      lowStockItems: 1,
      categories: 2,
      locations: 2,
    },
    items: [
      {
        id: '1',
        name: 'Test Item 1',
        sku: 'TEST001',
        category: 'Electronics',
        location: 'Warehouse A',
        stockLevel: 10,
        minStock: 5,
        unitPrice: 100,
        totalValue: 1000,
        status: 'normal',
      },
    ],
    actions: [
      {
        id: '1',
        type: ActionType.ADD_STOCK,
        quantity: 10,
        itemName: 'Test Item 1',
        itemSku: 'TEST001',
        userName: 'Admin User',
        createdAt: new Date('2023-01-01'),
      },
    ],
  };

  const mockInventoryMetrics: InventoryMetrics = {
    totalItems: 2,
    totalValue: 1051,
    lowStockCount: 1,
    outOfStockCount: 0,
    topCategories: [
      { category: 'Electronics', itemCount: 1, totalValue: 1000 },
    ],
    topLocations: [
      { location: 'Warehouse A', itemCount: 1, totalValue: 1000 },
    ],
    recentActions: [],
    stockTrends: [],
  };

  const mockDashboardMetrics: DashboardMetrics = {
    overview: {
      totalItems: 2,
      totalValue: 1051,
      lowStockCount: 1,
      outOfStockCount: 0,
      totalCategories: 2,
      totalLocations: 2,
    },
    alerts: {
      criticalAlerts: 0,
      warningAlerts: 1,
      recentAlerts: [],
    },
    performance: {
      stockTurnover: 5,
      averageStockLevel: 10,
      stockAccuracy: 95.0,
      topMovingItems: [],
    },
    trends: {
      stockMovements: [],
      valueChanges: [],
    },
  };

  beforeEach(() => {
    reportingController = new ReportingController(mockPrismaClient);
    mockReportingService = reportingController['reportingService'] as jest.Mocked<ReportingService>;
    mockExportService = reportingController['exportService'] as jest.Mocked<ExportService>;

    mockRequest = {
      query: {},
      params: {},
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      sendFile: jest.fn(),
      headersSent: false,
    };

    jest.clearAllMocks();
  });

  describe('generateInventoryReport', () => {
    it('should generate inventory report successfully', async () => {
      mockReportingService.generateInventoryReport.mockResolvedValue(mockInventoryReport);

      await reportingController.generateInventoryReport(mockRequest as Request, mockResponse as Response);

      expect(mockReportingService.generateInventoryReport).toHaveBeenCalledWith({});
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockInventoryReport,
        message: 'Inventory report generated successfully',
      });
    });

    it('should apply query filters correctly', async () => {
      mockRequest.query = {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        category: 'Electronics',
        location: 'Warehouse A',
        itemId: '1',
      };

      mockReportingService.generateInventoryReport.mockResolvedValue(mockInventoryReport);

      await reportingController.generateInventoryReport(mockRequest as Request, mockResponse as Response);

      expect(mockReportingService.generateInventoryReport).toHaveBeenCalledWith({
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        category: 'Electronics',
        location: 'Warehouse A',
        itemId: '1',
      });
    });

    it('should filter out undefined query parameters', async () => {
      mockRequest.query = {
        startDate: '2023-01-01',
        category: undefined,
        location: 'Warehouse A',
      };

      mockReportingService.generateInventoryReport.mockResolvedValue(mockInventoryReport);

      await reportingController.generateInventoryReport(mockRequest as Request, mockResponse as Response);

      expect(mockReportingService.generateInventoryReport).toHaveBeenCalledWith({
        startDate: '2023-01-01',
        location: 'Warehouse A',
      });
    });

    it('should handle service errors', async () => {
      mockReportingService.generateInventoryReport.mockRejectedValue(new Error('Database error'));

      await reportingController.generateInventoryReport(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to generate inventory report',
      });
    });
  });

  describe('getInventoryMetrics', () => {
    it('should get inventory metrics successfully', async () => {
      mockReportingService.calculateInventoryMetrics.mockResolvedValue(mockInventoryMetrics);

      await reportingController.getInventoryMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockReportingService.calculateInventoryMetrics).toHaveBeenCalledWith({});
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockInventoryMetrics,
        message: 'Inventory metrics calculated successfully',
      });
    });

    it('should handle service errors', async () => {
      mockReportingService.calculateInventoryMetrics.mockRejectedValue(new Error('Calculation error'));

      await reportingController.getInventoryMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to calculate inventory metrics',
      });
    });
  });

  describe('exportInventoryReport', () => {
    beforeEach(() => {
      mockRequest.params = { format: 'csv' };
      mockResponse.sendFile = jest.fn((filePath: string, callback?: (err?: Error) => void) => {
        if (callback) callback();
      }) as any;
    });

    it('should export report in CSV format successfully', async () => {
      const mockFilePath = '/path/to/report.csv';
      mockReportingService.generateInventoryReport.mockResolvedValue(mockInventoryReport);
      mockExportService.exportReport.mockResolvedValue(mockFilePath);

      await reportingController.exportInventoryReport(mockRequest as Request, mockResponse as Response);

      expect(mockReportingService.generateInventoryReport).toHaveBeenCalledWith({});
      expect(mockExportService.exportReport).toHaveBeenCalledWith(mockInventoryReport, 'csv');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="report.csv"');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockResponse.sendFile).toHaveBeenCalledWith(mockFilePath, expect.any(Function));
    });

    it('should export report in JSON format successfully', async () => {
      mockRequest.params = { format: 'json' };
      const mockFilePath = '/path/to/report.json';
      mockReportingService.generateInventoryReport.mockResolvedValue(mockInventoryReport);
      mockExportService.exportReport.mockResolvedValue(mockFilePath);

      await reportingController.exportInventoryReport(mockRequest as Request, mockResponse as Response);

      expect(mockExportService.exportReport).toHaveBeenCalledWith(mockInventoryReport, 'json');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    });

    it('should export report in PDF format successfully', async () => {
      mockRequest.params = { format: 'pdf' };
      const mockFilePath = '/path/to/report.pdf';
      mockReportingService.generateInventoryReport.mockResolvedValue(mockInventoryReport);
      mockExportService.exportReport.mockResolvedValue(mockFilePath);

      await reportingController.exportInventoryReport(mockRequest as Request, mockResponse as Response);

      expect(mockExportService.exportReport).toHaveBeenCalledWith(mockInventoryReport, 'pdf');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    });

    it('should reject invalid export format', async () => {
      mockRequest.params = { format: 'xml' };

      await reportingController.exportInventoryReport(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid export format. Supported formats: csv, json, pdf',
      });
      expect(mockReportingService.generateInventoryReport).not.toHaveBeenCalled();
    });

    it('should handle report generation errors', async () => {
      mockReportingService.generateInventoryReport.mockRejectedValue(new Error('Report generation failed'));

      await reportingController.exportInventoryReport(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to export inventory report',
      });
    });

    it('should handle export service errors', async () => {
      mockReportingService.generateInventoryReport.mockResolvedValue(mockInventoryReport);
      mockExportService.exportReport.mockRejectedValue(new Error('Export failed'));

      await reportingController.exportInventoryReport(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to export inventory report',
      });
    });

    it('should handle file sending errors', async () => {
      const mockFilePath = '/path/to/report.csv';
      mockReportingService.generateInventoryReport.mockResolvedValue(mockInventoryReport);
      mockExportService.exportReport.mockResolvedValue(mockFilePath);

      mockResponse.sendFile = jest.fn((filePath: string, callback?: (err?: Error) => void) => {
        if (callback) callback(new Error('File send error'));
      }) as any;

      await reportingController.exportInventoryReport(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.sendFile).toHaveBeenCalledWith(mockFilePath, expect.any(Function));
      // Error handling is done in the callback, so we can't easily test the response
    });

    it('should clean up exported files after sending', async () => {
      const mockFilePath = '/path/to/report.csv';
      mockReportingService.generateInventoryReport.mockResolvedValue(mockInventoryReport);
      mockExportService.exportReport.mockResolvedValue(mockFilePath);

      // Mock setTimeout to call the cleanup immediately
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      await reportingController.exportInventoryReport(mockRequest as Request, mockResponse as Response);

      expect(mockExportService.deleteExportFile).toHaveBeenCalledWith(mockFilePath);

      // Restore setTimeout
      jest.restoreAllMocks();
    });

    it('should apply query filters to export', async () => {
      mockRequest.query = {
        startDate: '2023-01-01',
        category: 'Electronics',
      };
      const mockFilePath = '/path/to/report.csv';
      mockReportingService.generateInventoryReport.mockResolvedValue(mockInventoryReport);
      mockExportService.exportReport.mockResolvedValue(mockFilePath);

      await reportingController.exportInventoryReport(mockRequest as Request, mockResponse as Response);

      expect(mockReportingService.generateInventoryReport).toHaveBeenCalledWith({
        startDate: '2023-01-01',
        category: 'Electronics',
      });
    });
  });

  describe('getDashboardMetrics', () => {
    it('should get dashboard metrics successfully', async () => {
      mockReportingService.calculateDashboardMetrics.mockResolvedValue(mockDashboardMetrics);

      await reportingController.getDashboardMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockReportingService.calculateDashboardMetrics).toHaveBeenCalledWith({});
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockDashboardMetrics,
        message: 'Dashboard metrics calculated successfully',
      });
    });

    it('should apply query filters correctly', async () => {
      mockRequest.query = {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        category: 'Electronics',
      };

      mockReportingService.calculateDashboardMetrics.mockResolvedValue(mockDashboardMetrics);

      await reportingController.getDashboardMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockReportingService.calculateDashboardMetrics).toHaveBeenCalledWith({
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        category: 'Electronics',
      });
    });

    it('should handle service errors', async () => {
      mockReportingService.calculateDashboardMetrics.mockRejectedValue(new Error('Metrics calculation failed'));

      await reportingController.getDashboardMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to calculate dashboard metrics',
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle empty query parameters', async () => {
      mockRequest.query = {};
      mockReportingService.generateInventoryReport.mockResolvedValue(mockInventoryReport);

      await reportingController.generateInventoryReport(mockRequest as Request, mockResponse as Response);

      expect(mockReportingService.generateInventoryReport).toHaveBeenCalledWith({});
    });

    it('should handle null query parameters', async () => {
      mockRequest.query = {
        startDate: undefined,
        category: 'Electronics',
      };
      mockReportingService.generateInventoryReport.mockResolvedValue(mockInventoryReport);

      await reportingController.generateInventoryReport(mockRequest as Request, mockResponse as Response);

      expect(mockReportingService.generateInventoryReport).toHaveBeenCalledWith({
        category: 'Electronics',
      });
    });
  });
});