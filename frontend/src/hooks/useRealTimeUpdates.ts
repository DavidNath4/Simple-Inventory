import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { webSocketService } from '../services/websocket.service';
import { InventoryItem, Alert } from '../types';

interface UseRealTimeUpdatesOptions {
  enableInventoryUpdates?: boolean;
  enableAlerts?: boolean;
  onInventoryUpdate?: (data: {
    type: 'created' | 'updated' | 'deleted' | 'stock_updated';
    item: InventoryItem;
    userId?: string;
    details?: any;
    timestamp: string;
  }) => void;
  onAlertUpdate?: (alerts: Alert[]) => void;
  onNewAlert?: (alert: Alert) => void;
}

export const useRealTimeUpdates = (options: UseRealTimeUpdatesOptions = {}) => {
  const { user, token } = useAuth();
  const { addNotification, addAlert } = useNotifications();
  const connectionAttempted = useRef(false);
  const isSubscribed = useRef(false);

  const {
    enableInventoryUpdates = true,
    enableAlerts = true,
    onInventoryUpdate,
    onAlertUpdate,
    onNewAlert
  } = options;

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    if (user && token && !connectionAttempted.current) {
      connectionAttempted.current = true;
      
      webSocketService.connect(token)
        .then(() => {
          console.log('WebSocket connected successfully');
          
          // Subscribe to updates based on options
          if (enableInventoryUpdates) {
            webSocketService.subscribeToInventoryUpdates();
          }
          
          if (enableAlerts) {
            webSocketService.subscribeToAlerts();
          }
          
          isSubscribed.current = true;
        })
        .catch((error) => {
          console.error('Failed to connect to WebSocket:', error);
          connectionAttempted.current = false;
        });
    }

    // Cleanup on unmount or user logout
    return () => {
      if (!user || !token) {
        webSocketService.disconnect();
        connectionAttempted.current = false;
        isSubscribed.current = false;
      }
    };
  }, [user, token, enableInventoryUpdates, enableAlerts]);

  // Handle inventory updates
  const handleInventoryUpdate = useCallback((data: {
    type: 'created' | 'updated' | 'deleted' | 'stock_updated';
    item: InventoryItem;
    userId?: string;
    details?: any;
    timestamp: string;
  }) => {
    // Don't show notifications for updates made by the current user
    if (data.userId !== user?.id) {
      let title = '';
      let message = '';
      let type: 'success' | 'info' | 'warning' = 'info';

      switch (data.type) {
        case 'created':
          title = 'New Item Added';
          message = `${data.item.name} has been added to inventory`;
          type = 'success';
          break;
        case 'updated':
          title = 'Item Updated';
          message = `${data.item.name} has been updated`;
          type = 'info';
          break;
        case 'deleted':
          title = 'Item Removed';
          message = `${data.item.name} has been removed from inventory`;
          type = 'warning';
          break;
        case 'stock_updated':
          title = 'Stock Updated';
          if (data.details?.oldStock !== undefined && data.details?.newStock !== undefined) {
            const change = data.details.newStock - data.details.oldStock;
            const changeText = change > 0 ? `+${change}` : `${change}`;
            message = `${data.item.name}: ${data.details.oldStock} → ${data.details.newStock} (${changeText})`;
          } else {
            message = `${data.item.name} stock has been updated`;
          }
          type = 'info';
          break;
      }

      addNotification({
        type,
        title,
        message,
        duration: 4000
      });
    }

    // Call custom handler if provided
    if (onInventoryUpdate) {
      onInventoryUpdate(data);
    }
  }, [user?.id, addNotification, onInventoryUpdate]);

  // Handle new alerts
  const handleNewAlert = useCallback((alertData: Alert & { timestamp: string }) => {
    const alert: Alert = {
      id: alertData.id,
      type: alertData.type,
      severity: alertData.severity,
      title: alertData.title,
      message: alertData.message,
      itemId: alertData.itemId,
      itemName: alertData.itemName,
      itemSku: alertData.itemSku,
      currentStock: alertData.currentStock,
      minStock: alertData.minStock,
      location: alertData.location,
      category: alertData.category,
      createdAt: new Date(alertData.timestamp),
      acknowledged: false,
      dismissible: true
    };

    addAlert(alert);

    // Show notification for critical alerts
    if (alert.severity === 'critical') {
      addNotification({
        type: 'warning',
        title: 'Critical Stock Alert',
        message: alert.message,
        duration: 8000
      });
    }

    // Call custom handler if provided
    if (onNewAlert) {
      onNewAlert(alert);
    }
  }, [addAlert, addNotification, onNewAlert]);

  // Handle alert updates
  const handleAlertUpdate = useCallback((data: {
    alerts: Alert[];
    timestamp: string;
  }) => {
    // Process alerts and add them to the notification system
    data.alerts.forEach(alertData => {
      const alert: Alert = {
        ...alertData,
        createdAt: new Date(alertData.createdAt),
        acknowledged: false,
        dismissible: true
      };
      addAlert(alert);
    });

    // Call custom handler if provided
    if (onAlertUpdate) {
      onAlertUpdate(data.alerts);
    }
  }, [addAlert, onAlertUpdate]);

  // Handle general notifications
  const handleNotification = useCallback((notification: {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    data?: any;
    timestamp: string;
  }) => {
    addNotification({
      type: notification.type,
      title: notification.title,
      message: notification.message,
      duration: 5000
    });
  }, [addNotification]);

  // Handle system notifications
  const handleSystemNotification = useCallback((notification: {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    data?: any;
    timestamp: string;
  }) => {
    addNotification({
      type: notification.type,
      title: `System: ${notification.title}`,
      message: notification.message,
      duration: 0 // Persistent for system notifications
    });
  }, [addNotification]);

  // Handle WebSocket errors
  const handleWebSocketError = useCallback((error: { message: string }) => {
    console.error('WebSocket error:', error);
    addNotification({
      type: 'error',
      title: 'Connection Error',
      message: 'Real-time updates may be delayed',
      duration: 5000
    });
  }, [addNotification]);

  // Set up event listeners
  useEffect(() => {
    if (isSubscribed.current) {
      webSocketService.on('inventory:update', handleInventoryUpdate);
      webSocketService.on('alerts:new', handleNewAlert);
      webSocketService.on('alerts:update', handleAlertUpdate);
      webSocketService.on('notification', handleNotification);
      webSocketService.on('system:notification', handleSystemNotification);
      webSocketService.on('error', handleWebSocketError);

      return () => {
        webSocketService.off('inventory:update', handleInventoryUpdate);
        webSocketService.off('alerts:new', handleNewAlert);
        webSocketService.off('alerts:update', handleAlertUpdate);
        webSocketService.off('notification', handleNotification);
        webSocketService.off('system:notification', handleSystemNotification);
        webSocketService.off('error', handleWebSocketError);
      };
    }
  }, [
    handleInventoryUpdate,
    handleNewAlert,
    handleAlertUpdate,
    handleNotification,
    handleSystemNotification,
    handleWebSocketError
  ]);

  // Manual alert check
  const checkAlerts = useCallback(() => {
    if (webSocketService.isConnected()) {
      webSocketService.checkAlerts();
    }
  }, []);

  // Get connection status
  const getConnectionStatus = useCallback(() => {
    return webSocketService.getStatus();
  }, []);

  return {
    isConnected: webSocketService.isConnected(),
    checkAlerts,
    getConnectionStatus
  };
};