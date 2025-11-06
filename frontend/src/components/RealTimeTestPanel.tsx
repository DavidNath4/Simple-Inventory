import React, { useState } from 'react';
import { apiService } from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';

interface RealTimeTestPanelProps {
  className?: string;
}

export const RealTimeTestPanel: React.FC<RealTimeTestPanelProps> = ({ className = '' }) => {
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotifications();

  const sendTestBroadcast = async (type: 'notification' | 'inventory' | 'alert', message?: string) => {
    try {
      setLoading(true);
      
      const response = await apiService.post('/realtime/test-broadcast', {
        type,
        message: message || `Test ${type} message`
      }) as any;

      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Test Broadcast Sent',
          message: response.message,
          duration: 3000
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Test Failed',
        message: error instanceof Error ? error.message : 'Failed to send test broadcast',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const getConnectionStatus = async () => {
    try {
      setLoading(true);
      
      const response = await apiService.get('/realtime/status') as any;

      if (response.success) {
        addNotification({
          type: 'info',
          title: 'Connection Status',
          message: `Connected users: ${response.data.totalConnectedUsers} (Admin: ${response.data.adminUsers}, User: ${response.data.regularUsers})`,
          duration: 5000
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Status Check Failed',
        message: error instanceof Error ? error.message : 'Failed to get connection status',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Real-Time Testing</h3>
      <p className="text-sm text-gray-600 mb-4">
        Test real-time WebSocket functionality (Development only)
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => sendTestBroadcast('notification')}
          disabled={loading}
          className="btn-secondary text-sm"
        >
          Test Notification
        </button>
        
        <button
          onClick={() => sendTestBroadcast('inventory')}
          disabled={loading}
          className="btn-secondary text-sm"
        >
          Test Inventory Update
        </button>
        
        <button
          onClick={() => sendTestBroadcast('alert')}
          disabled={loading}
          className="btn-secondary text-sm"
        >
          Test Alert
        </button>
        
        <button
          onClick={getConnectionStatus}
          disabled={loading}
          className="btn-primary text-sm"
        >
          Check Status
        </button>
      </div>
      
      {loading && (
        <div className="mt-4 flex items-center text-sm text-gray-500">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </div>
      )}
    </div>
  );
};

export default RealTimeTestPanel;