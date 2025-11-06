import { PrismaClient } from '@prisma/client';
import { AlertService } from './alert.service';

export class SchedulerService {
  private alertService: AlertService;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(private prisma: PrismaClient) {
    this.alertService = new AlertService(prisma);
  }

  // Start the background monitoring service
  startMonitoring(intervalMinutes: number = 30): void {
    if (this.isRunning) {
      console.log('Monitoring service is already running');
      return;
    }

    console.log(`Starting inventory monitoring service (checking every ${intervalMinutes} minutes)`);
    
    // Run initial check
    this.performMonitoringCheck();

    // Set up recurring checks
    this.monitoringInterval = setInterval(() => {
      this.performMonitoringCheck();
    }, intervalMinutes * 60 * 1000); // Convert minutes to milliseconds

    this.isRunning = true;
  }

  // Stop the background monitoring service
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isRunning = false;
    console.log('Inventory monitoring service stopped');
  }

  // Perform a single monitoring check
  private async performMonitoringCheck(): Promise<void> {
    try {
      console.log('Performing inventory monitoring check...');
      
      const monitoring = await this.alertService.monitorStockLevels();
      const statistics = await this.alertService.getAlertStatistics();

      // Log monitoring results
      console.log(`Monitoring Results:
        - Out of Stock: ${monitoring.outOfStock.length} items
        - Critical Stock: ${monitoring.critical.length} items
        - Low Stock: ${monitoring.lowStock.length} items
        - Total Alerts: ${statistics.total}`);

      // Log critical items that need immediate attention
      if (monitoring.outOfStock.length > 0) {
        console.warn('⚠️  OUT OF STOCK ITEMS:');
        monitoring.outOfStock.forEach(item => {
          console.warn(`   - ${item.name} (${item.sku}) at ${item.location}`);
        });
      }

      if (monitoring.critical.length > 0) {
        console.warn('🔴 CRITICAL STOCK ITEMS:');
        monitoring.critical.forEach(item => {
          console.warn(`   - ${item.name} (${item.sku}): ${item.stockLevel}/${item.minStock} at ${item.location}`);
        });
      }

      // In a real application, you might want to:
      // - Send email notifications
      // - Push notifications to admin users
      // - Log to external monitoring systems
      // - Trigger automated reordering processes

    } catch (error) {
      console.error('Error during monitoring check:', error);
    }
  }

  // Get monitoring status
  getStatus(): {
    isRunning: boolean;
    intervalId: NodeJS.Timeout | null;
  } {
    return {
      isRunning: this.isRunning,
      intervalId: this.monitoringInterval,
    };
  }

  // Perform manual monitoring check (for testing or manual triggers)
  async performManualCheck(): Promise<{
    timestamp: Date;
    results: any;
    statistics: any;
  }> {
    try {
      const results = await this.alertService.monitorStockLevels();
      const statistics = await this.alertService.getAlertStatistics();

      return {
        timestamp: new Date(),
        results,
        statistics,
      };
    } catch (error) {
      console.error('Error during manual monitoring check:', error);
      throw error;
    }
  }
}