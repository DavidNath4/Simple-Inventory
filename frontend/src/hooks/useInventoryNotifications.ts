import { useEffect, useCallback } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { apiService } from '../services/api';
import { useRealTimeUpdates } from './useRealTimeUpdates';
import { InventoryItem, DashboardMetrics } from '../types';

export const useInventoryNotifications = () => {
  const { addNotification, addAlert } = useNotifications();
  
  // Enable real-time updates for inventory and alerts
  const { isConnected, checkAlerts } = useRealTimeUpdates({
    enableInventoryUpdates: true,
    enableAlerts: true
  });

  // Check for low stock alerts
  const checkLowStockAlerts = useCallback(async () => {
    try {
      // Get alerts from the dedicated alerts endpoint
      const alertsResponse = (await apiService.getAlerts()) as { data: any[] };
      const alerts = alertsResponse.data || [];

      // Process alerts and add them to the notification system
      alerts.forEach((alert: any) => {
        addAlert({
          type:
            alert.severity === 'OUT_OF_STOCK' ? 'out_of_stock' : 'low_stock',
          severity:
            alert.severity === 'OUT_OF_STOCK'
              ? 'critical'
              : alert.severity === 'CRITICAL'
                ? 'high'
                : 'medium',
          title:
            alert.severity === 'OUT_OF_STOCK'
              ? 'Out of Stock Alert'
              : 'Low Stock Alert',
          message: `${alert.itemName} (${alert.sku}) is ${alert.severity === 'OUT_OF_STOCK' ? 'out of stock' : 'running low'}`,
          itemId: alert.itemId,
          itemName: alert.itemName,
          itemSku: alert.sku,
          currentStock: alert.currentStock,
          minStock: alert.minStock,
          location: alert.location,
          category: alert.category,
          dismissible: true,
        });
      });

      // Also check dashboard metrics for additional context
      const metricsResponse = (await apiService.getDashboardMetrics()) as {
        data: DashboardMetrics;
      };
      const metrics: DashboardMetrics = metricsResponse.data;

      // Process recent alerts from the dashboard metrics as backup
      if (metrics.alerts && metrics.alerts.recentAlerts) {
        metrics.alerts.recentAlerts.forEach((alert) => {
          addAlert({
            type: alert.severity === 'critical' ? 'out_of_stock' : 'low_stock',
            severity: alert.severity === 'critical' ? 'critical' : 'medium',
            title:
              alert.severity === 'critical'
                ? 'Critical Stock Alert'
                : 'Low Stock Alert',
            message: `${alert.itemName} (${alert.itemSku}) is ${alert.severity === 'critical' ? 'critically low' : 'running low'} on stock`,
            itemId: alert.id,
            itemName: alert.itemName,
            itemSku: alert.itemSku,
            currentStock: alert.currentStock,
            minStock: alert.minStock,
            dismissible: true,
          });
        });
      }
    } catch (error) {
      console.error('Error checking low stock alerts:', error);
    }
  }, [addAlert]);

  // Show notification for inventory updates
  const notifyInventoryUpdate = useCallback(
    (
      action: 'created' | 'updated' | 'deleted' | 'stock_updated',
      item: InventoryItem,
      details?: { oldStock?: number; newStock?: number; quantity?: number }
    ) => {
      let title = '';
      let message = '';
      let type: 'success' | 'info' | 'warning' = 'success';

      switch (action) {
        case 'created':
          title = 'Item Created';
          message = `${item.name} has been added to inventory`;
          break;
        case 'updated':
          title = 'Item Updated';
          message = `${item.name} has been updated`;
          type = 'info';
          break;
        case 'deleted':
          title = 'Item Deleted';
          message = `${item.name} has been removed from inventory`;
          type = 'warning';
          break;
        case 'stock_updated':
          title = 'Stock Updated';
          if (
            details?.oldStock !== undefined &&
            details?.newStock !== undefined
          ) {
            const change = details.newStock - details.oldStock;
            const changeText = change > 0 ? `+${change}` : `${change}`;
            message = `${item.name} stock updated: ${details.oldStock} → ${details.newStock} (${changeText})`;
          } else {
            message = `${item.name} stock has been updated`;
          }
          type = 'info';
          break;
      }

      addNotification({
        type,
        title,
        message,
        duration: 4000,
      });

      // Check if the update resulted in low stock
      if (action === 'stock_updated' && item.stockLevel <= item.minStock) {
        const severity =
          item.stockLevel === 0
            ? 'critical'
            : item.stockLevel <= item.minStock * 0.25
              ? 'high'
              : 'medium';

        addAlert({
          type: item.stockLevel === 0 ? 'out_of_stock' : 'low_stock',
          severity,
          title:
            item.stockLevel === 0 ? 'Out of Stock Alert' : 'Low Stock Alert',
          message: `${item.name} is ${item.stockLevel === 0 ? 'out of stock' : 'running low'}`,
          itemId: item.id,
          itemName: item.name,
          itemSku: item.sku,
          currentStock: item.stockLevel,
          minStock: item.minStock,
          location: item.location,
          category: item.category,
          dismissible: true,
        });
      }
    },
    [addNotification, addAlert]
  );

  // Show notification for bulk operations
  const notifyBulkOperation = useCallback(
    (
      operation: 'update' | 'delete' | 'create',
      count: number,
      success: boolean = true
    ) => {
      const operationText = {
        update: 'updated',
        delete: 'deleted',
        create: 'created',
      };

      addNotification({
        type: success ? 'success' : 'error',
        title: success ? 'Bulk Operation Complete' : 'Bulk Operation Failed',
        message: success
          ? `Successfully ${operationText[operation]} ${count} item${count !== 1 ? 's' : ''}`
          : `Failed to ${operation} ${count} item${count !== 1 ? 's' : ''}`,
        duration: 3000,
      });
    },
    [addNotification]
  );

  // Show system notifications
  const notifySystem = useCallback(
    (
      type: 'success' | 'error' | 'warning' | 'info',
      title: string,
      message: string,
      persistent: boolean = false
    ) => {
      addNotification({
        type,
        title,
        message,
        duration: persistent ? 0 : 5000,
      });
    },
    [addNotification]
  );

  // Periodic check for alerts (reduced frequency when real-time is available)
  useEffect(() => {
    // Initial check
    checkLowStockAlerts();

    // Set up periodic checking - less frequent if real-time is connected
    const interval = isConnected ? 10 * 60 * 1000 : 5 * 60 * 1000; // 10 minutes if connected, 5 minutes if not
    const intervalId = setInterval(checkLowStockAlerts, interval);

    return () => clearInterval(intervalId);
  }, [checkLowStockAlerts, isConnected]);

  return {
    notifyInventoryUpdate,
    notifyBulkOperation,
    notifySystem,
    checkLowStockAlerts,
    isRealTimeConnected: isConnected,
    checkAlertsManually: checkAlerts,
  };
};
