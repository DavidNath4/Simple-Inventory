import * as fs from 'fs';
import * as path from 'path';
import { ExportService } from '../../services/export.service';
import { InventoryReport, ExportFormat } from '../../types';
import { ActionType } from '@prisma/client';

// Mock fs module
jest.mock('fs');
jest.mock('csv-writer');
jest.mock('pdfkit');

describe('ExportService', () => {
  let exportService: ExportService;
  let mockFs: jest.Mocked<typeof fs>;

  const mockReport: InventoryReport = {
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
      {
        id: '2',
        name: 'Test Item 2',
        sku: 'TEST002',
        category: 'Books',
        location: 'Warehouse B',
        stockLevel: 2,
        minStock: 5,
        unitPrice: 25.5,
        totalValue: 51,
        status: 'low_stock',
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

  beforeEach(() => {
    exportService = new ExportService();
    mockFs = fs as jest.Mocked<typeof fs>;
    jest.clearAllMocks();

    // Mock fs.existsSync to return false initially (directory doesn't exist)
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockImplementation(() => undefined);
    mockFs.writeFileSync.mockImplementation(() => undefined);
    mockFs.unlinkSync.mockImplementation(() => undefined);
  });

  describe('constructor', () => {
    it('should create export directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      new ExportService();

      expect(mockFs.existsSync).toHaveBeenCalled();
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('exports'),
        { recursive: true }
      );
    });

    it('should not create export directory if it already exists', () => {
      mockFs.existsSync.mockReturnValue(true);
      
      new ExportService();

      expect(mockFs.existsSync).toHaveBeenCalled();
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('exportReport', () => {
    it('should export report in CSV format', async () => {
      const mockCsvWriter = {
        writeRecords: jest.fn().mockResolvedValue(undefined),
      };

      // Mock csv-writer module
      const csvWriter = require('csv-writer');
      csvWriter.createObjectCsvWriter = jest.fn().mockReturnValue(mockCsvWriter);

      const result = await exportService.exportReport(mockReport, 'csv');

      expect(csvWriter.createObjectCsvWriter).toHaveBeenCalledWith({
        path: expect.stringContaining('.csv'),
        header: [
          { id: 'name', title: 'Name' },
          { id: 'sku', title: 'SKU' },
          { id: 'category', title: 'Category' },
          { id: 'location', title: 'Location' },
          { id: 'stockLevel', title: 'Stock Level' },
          { id: 'minStock', title: 'Min Stock' },
          { id: 'unitPrice', title: 'Unit Price' },
          { id: 'totalValue', title: 'Total Value' },
          { id: 'status', title: 'Status' },
        ],
      });
      expect(mockCsvWriter.writeRecords).toHaveBeenCalledWith(mockReport.items);
      expect(result).toContain('.csv');
    });

    it('should export report in JSON format', async () => {
      const result = await exportService.exportReport(mockReport, 'json');

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.json'),
        expect.stringContaining('"totalItems": 2')
      );
      expect(result).toContain('.json');
    });

    it('should export report in PDF format', async () => {
      const mockDoc = {
        fontSize: jest.fn().mockReturnThis(),
        text: jest.fn().mockReturnThis(),
        moveDown: jest.fn().mockReturnThis(),
        pipe: jest.fn(),
        end: jest.fn(),
        y: 100,
        addPage: jest.fn(),
      };

      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            setTimeout(callback, 0);
          }
        }),
      };

      const PDFDocument = require('pdfkit');
      PDFDocument.mockImplementation(() => mockDoc);
      mockFs.createWriteStream.mockReturnValue(mockStream as any);

      const result = await exportService.exportReport(mockReport, 'pdf');

      expect(PDFDocument).toHaveBeenCalled();
      expect(mockDoc.pipe).toHaveBeenCalledWith(mockStream);
      expect(mockDoc.text).toHaveBeenCalledWith('Inventory Report', { align: 'center' });
      expect(result).toContain('.pdf');
    });

    it('should throw error for unsupported format', async () => {
      await expect(
        exportService.exportReport(mockReport, 'xml' as ExportFormat)
      ).rejects.toThrow('Unsupported export format: xml');
    });

    it('should handle PDF generation errors', async () => {
      const mockDoc = {
        fontSize: jest.fn().mockReturnThis(),
        text: jest.fn().mockReturnThis(),
        moveDown: jest.fn().mockReturnThis(),
        pipe: jest.fn(),
        end: jest.fn(),
        y: 100,
        addPage: jest.fn(),
      };

      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('PDF generation failed')), 0);
          }
        }),
      };

      const PDFDocument = require('pdfkit');
      PDFDocument.mockImplementation(() => mockDoc);
      mockFs.createWriteStream.mockReturnValue(mockStream as any);

      await expect(
        exportService.exportReport(mockReport, 'pdf')
      ).rejects.toThrow('PDF generation failed');
    });
  });

  describe('getExportPath', () => {
    it('should return correct export path', () => {
      const filename = 'test-report.csv';
      const result = exportService.getExportPath(filename);

      expect(result).toContain('exports');
      expect(result).toContain(filename);
    });
  });

  describe('deleteExportFile', () => {
    it('should delete existing file', () => {
      mockFs.existsSync.mockReturnValue(true);
      const filePath = '/path/to/file.csv';

      exportService.deleteExportFile(filePath);

      expect(mockFs.existsSync).toHaveBeenCalledWith(filePath);
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(filePath);
    });

    it('should not attempt to delete non-existing file', () => {
      mockFs.existsSync.mockReturnValue(false);
      const filePath = '/path/to/nonexistent.csv';

      exportService.deleteExportFile(filePath);

      expect(mockFs.existsSync).toHaveBeenCalledWith(filePath);
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('file naming and timestamps', () => {
    it('should generate unique filenames with timestamps', async () => {
      const mockCsvWriter = {
        writeRecords: jest.fn().mockResolvedValue(undefined),
      };

      const csvWriter = require('csv-writer');
      csvWriter.createObjectCsvWriter = jest.fn().mockReturnValue(mockCsvWriter);

      const result1 = await exportService.exportReport(mockReport, 'csv');
      
      // Wait a small amount to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const result2 = await exportService.exportReport(mockReport, 'csv');

      expect(result1).not.toBe(result2);
      expect(result1).toContain('inventory-report-');
      expect(result2).toContain('inventory-report-');
    });
  });

  describe('data accuracy in exports', () => {
    it('should include all required fields in CSV export', async () => {
      const mockCsvWriter = {
        writeRecords: jest.fn().mockResolvedValue(undefined),
      };

      const csvWriter = require('csv-writer');
      csvWriter.createObjectCsvWriter = jest.fn().mockReturnValue(mockCsvWriter);

      await exportService.exportReport(mockReport, 'csv');

      const csvConfig = csvWriter.createObjectCsvWriter.mock.calls[0][0];
      const headerIds = csvConfig.header.map((h: any) => h.id);
      
      expect(headerIds).toContain('name');
      expect(headerIds).toContain('sku');
      expect(headerIds).toContain('category');
      expect(headerIds).toContain('location');
      expect(headerIds).toContain('stockLevel');
      expect(headerIds).toContain('minStock');
      expect(headerIds).toContain('unitPrice');
      expect(headerIds).toContain('totalValue');
      expect(headerIds).toContain('status');

      expect(mockCsvWriter.writeRecords).toHaveBeenCalledWith(mockReport.items);
    });

    it('should include complete data structure in JSON export', async () => {
      await exportService.exportReport(mockReport, 'json');

      const writeCall = mockFs.writeFileSync.mock.calls[0];
      const jsonData = JSON.parse(writeCall[1] as string);

      expect(jsonData).toHaveProperty('generatedAt');
      expect(jsonData).toHaveProperty('summary');
      expect(jsonData).toHaveProperty('items');
      expect(jsonData).toHaveProperty('recentActions');
      expect(jsonData.summary).toEqual(mockReport.summary);
      expect(jsonData.items).toEqual(mockReport.items);
      
      // Check actions structure but handle date serialization
      expect(jsonData.recentActions).toHaveLength(mockReport.actions.length);
      expect(jsonData.recentActions[0]).toMatchObject({
        id: mockReport.actions[0].id,
        type: mockReport.actions[0].type,
        quantity: mockReport.actions[0].quantity,
        itemName: mockReport.actions[0].itemName,
        itemSku: mockReport.actions[0].itemSku,
        userName: mockReport.actions[0].userName,
      });
      expect(jsonData.recentActions[0].createdAt).toBe(mockReport.actions[0].createdAt.toISOString());
    });
  });
});