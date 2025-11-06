import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import PDFDocument from 'pdfkit';
import { InventoryReport, ExportFormat } from '../types';

export class ExportService {
  private exportDir: string;

  constructor() {
    this.exportDir = path.join(process.cwd(), 'exports');
    this.ensureExportDirectory();
  }

  private ensureExportDirectory(): void {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  async exportReport(report: InventoryReport, format: ExportFormat): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `inventory-report-${timestamp}`;

    switch (format) {
      case 'csv':
        return await this.exportToCSV(report, filename);
      case 'json':
        return await this.exportToJSON(report, filename);
      case 'pdf':
        return await this.exportToPDF(report, filename);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private async exportToCSV(report: InventoryReport, filename: string): Promise<string> {
    const filePath = path.join(this.exportDir, `${filename}.csv`);

    // Create CSV writer for inventory items
    const csvWriter = createObjectCsvWriter({
      path: filePath,
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

    await csvWriter.writeRecords(report.items);
    return filePath;
  }

  private async exportToJSON(report: InventoryReport, filename: string): Promise<string> {
    const filePath = path.join(this.exportDir, `${filename}.json`);
    
    const exportData = {
      generatedAt: new Date().toISOString(),
      summary: report.summary,
      items: report.items,
      recentActions: report.actions,
    };

    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
    return filePath;
  }

  private async exportToPDF(report: InventoryReport, filename: string): Promise<string> {
    const filePath = path.join(this.exportDir, `${filename}.pdf`);
    
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20).text('Inventory Report', { align: 'center' });
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
        doc.moveDown();

        // Summary section
        doc.fontSize(16).text('Summary', { underline: true });
        doc.fontSize(12);
        doc.text(`Total Items: ${report.summary.totalItems}`);
        doc.text(`Total Value: $${report.summary.totalValue.toFixed(2)}`);
        doc.text(`Low Stock Items: ${report.summary.lowStockItems}`);
        doc.text(`Categories: ${report.summary.categories}`);
        doc.text(`Locations: ${report.summary.locations}`);
        doc.moveDown();

        // Items section
        doc.fontSize(16).text('Inventory Items', { underline: true });
        doc.fontSize(10);

        // Table headers
        const startY = doc.y;
        const colWidths = [120, 80, 80, 80, 60, 60, 80];
        const headers = ['Name', 'SKU', 'Category', 'Location', 'Stock', 'Min Stock', 'Status'];
        
        let currentX = 50;
        headers.forEach((header, index) => {
          doc.text(header, currentX, startY, { width: colWidths[index], align: 'left' });
          currentX += colWidths[index];
        });

        doc.moveDown();

        // Table rows (limit to first 50 items for PDF readability)
        const itemsToShow = report.items.slice(0, 50);
        itemsToShow.forEach((item) => {
          const rowY = doc.y;
          currentX = 50;
          
          const rowData = [
            item.name.substring(0, 15) + (item.name.length > 15 ? '...' : ''),
            item.sku,
            item.category.substring(0, 10) + (item.category.length > 10 ? '...' : ''),
            item.location.substring(0, 10) + (item.location.length > 10 ? '...' : ''),
            item.stockLevel.toString(),
            item.minStock.toString(),
            item.status,
          ];

          rowData.forEach((data, index) => {
            doc.text(data, currentX, rowY, { width: colWidths[index], align: 'left' });
            currentX += colWidths[index];
          });

          doc.moveDown(0.5);

          // Add new page if needed
          if (doc.y > 700) {
            doc.addPage();
          }
        });

        if (report.items.length > 50) {
          doc.moveDown();
          doc.text(`... and ${report.items.length - 50} more items (see CSV/JSON export for complete data)`);
        }

        doc.end();

        stream.on('finish', () => {
          resolve(filePath);
        });

        stream.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  getExportPath(filename: string): string {
    return path.join(this.exportDir, filename);
  }

  deleteExportFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}