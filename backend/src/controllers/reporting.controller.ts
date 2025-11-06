import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ReportingService } from '../services/reporting.service';
import { ExportService } from '../services/export.service';
import { ReportFilter, ApiResponse, InventoryReport, InventoryMetrics, DashboardMetrics, ExportFormat } from '../types';
import * as path from 'path';

export class ReportingController {
  private reportingService: ReportingService;
  private exportService: ExportService;

  constructor(private prisma: PrismaClient) {
    this.reportingService = new ReportingService(prisma);
    this.exportService = new ExportService();
  }

  generateInventoryReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const filter: ReportFilter = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        category: req.query.category as string,
        location: req.query.location as string,
        itemId: req.query.itemId as string,
      };

      // Remove undefined values
      Object.keys(filter).forEach(key => {
        if (filter[key as keyof ReportFilter] === undefined) {
          delete filter[key as keyof ReportFilter];
        }
      });

      const report = await this.reportingService.generateInventoryReport(filter);

      const response: ApiResponse<InventoryReport> = {
        success: true,
        data: report,
        message: 'Inventory report generated successfully',
      };

      res.json(response);
    } catch (error) {
      console.error('Error generating inventory report:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: 'Failed to generate inventory report',
      };
      res.status(500).json(response);
    }
  };

  getInventoryMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const filter: ReportFilter = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        category: req.query.category as string,
        location: req.query.location as string,
      };

      // Remove undefined values
      Object.keys(filter).forEach(key => {
        if (filter[key as keyof ReportFilter] === undefined) {
          delete filter[key as keyof ReportFilter];
        }
      });

      const metrics = await this.reportingService.calculateInventoryMetrics(filter);

      const response: ApiResponse<InventoryMetrics> = {
        success: true,
        data: metrics,
        message: 'Inventory metrics calculated successfully',
      };

      res.json(response);
    } catch (error) {
      console.error('Error calculating inventory metrics:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: 'Failed to calculate inventory metrics',
      };
      res.status(500).json(response);
    }
  };

  exportInventoryReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const format = req.params.format as ExportFormat;
      
      if (!['csv', 'json', 'pdf'].includes(format)) {
        const response: ApiResponse<never> = {
          success: false,
          error: 'Invalid export format. Supported formats: csv, json, pdf',
        };
        res.status(400).json(response);
        return;
      }

      const filter: ReportFilter = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        category: req.query.category as string,
        location: req.query.location as string,
        itemId: req.query.itemId as string,
      };

      // Remove undefined values
      Object.keys(filter).forEach(key => {
        if (filter[key as keyof ReportFilter] === undefined) {
          delete filter[key as keyof ReportFilter];
        }
      });

      // Generate report
      const report = await this.reportingService.generateInventoryReport(filter);
      
      // Export to requested format
      const filePath = await this.exportService.exportReport(report, format);
      const filename = path.basename(filePath);

      // Set appropriate headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
      } else if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
      } else if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
      }

      // Send file
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('Error sending file:', err);
          if (!res.headersSent) {
            const response: ApiResponse<never> = {
              success: false,
              error: 'Failed to download report',
            };
            res.status(500).json(response);
          }
        }
        
        // Clean up file after sending (optional - you might want to keep files for a while)
        setTimeout(() => {
          this.exportService.deleteExportFile(filePath);
        }, 60000); // Delete after 1 minute
      });

    } catch (error) {
      console.error('Error exporting inventory report:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: 'Failed to export inventory report',
      };
      res.status(500).json(response);
    }
  };

  getDashboardMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const filter: ReportFilter = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        category: req.query.category as string,
        location: req.query.location as string,
      };

      // Remove undefined values
      Object.keys(filter).forEach(key => {
        if (filter[key as keyof ReportFilter] === undefined) {
          delete filter[key as keyof ReportFilter];
        }
      });

      const dashboardMetrics = await this.reportingService.calculateDashboardMetrics(filter);

      const response: ApiResponse<DashboardMetrics> = {
        success: true,
        data: dashboardMetrics,
        message: 'Dashboard metrics calculated successfully',
      };

      res.json(response);
    } catch (error) {
      console.error('Error calculating dashboard metrics:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: 'Failed to calculate dashboard metrics',
      };
      res.status(500).json(response);
    }
  };
}