import React from 'react';
import { DashboardMetrics } from '../../types';

interface AlertsPanelProps {
  alerts: DashboardMetrics['alerts'];
  className?: string;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  className = '',
}) => {
  const getSeverityColor = (severity: 'critical' | 'warning') => {
    return severity === 'critical'
      ? 'bg-red-50 border-red-200 text-red-800'
      : 'bg-yellow-50 border-yellow-200 text-yellow-800';
  };

  const getSeverityIcon = (severity: 'critical' | 'warning') => {
    return severity === 'critical' ? '🚨' : '⚠️';
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}
    >
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-lg font-semibold text-gray-900'>Stock Alerts</h3>
        <div className='flex items-center space-x-4'>
          <div className='flex items-center'>
            <div className='w-3 h-3 bg-red-500 rounded-full mr-2'></div>
            <span className='text-sm text-gray-600'>
              Critical ({alerts.criticalAlerts})
            </span>
          </div>
          <div className='flex items-center'>
            <div className='w-3 h-3 bg-yellow-500 rounded-full mr-2'></div>
            <span className='text-sm text-gray-600'>
              Warning ({alerts.warningAlerts})
            </span>
          </div>
        </div>
      </div>

      {alerts.recentAlerts.length === 0 ? (
        <div className='text-center py-8'>
          <div className='text-4xl mb-2'>✅</div>
          <p className='text-gray-500'>No active alerts</p>
          <p className='text-sm text-gray-400 mt-1'>
            All inventory levels are healthy
          </p>
        </div>
      ) : (
        <div className='space-y-3 max-h-64 overflow-y-auto'>
          {alerts.recentAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
            >
              <div className='flex items-start justify-between'>
                <div className='flex items-start space-x-3'>
                  <span className='text-lg'>
                    {getSeverityIcon(alert.severity)}
                  </span>
                  <div className='flex-1'>
                    <h4 className='font-medium text-sm'>{alert.itemName}</h4>
                    <p className='text-xs opacity-75 mt-1'>
                      SKU: {alert.itemSku}
                    </p>
                    <div className='flex items-center space-x-4 mt-2 text-xs'>
                      <span>
                        Current: <strong>{alert.currentStock}</strong>
                      </span>
                      <span>
                        Min: <strong>{alert.minStock}</strong>
                      </span>
                      <span>
                        Shortage:{' '}
                        <strong>{alert.minStock - alert.currentStock}</strong>
                      </span>
                    </div>
                  </div>
                </div>
                <div className='text-xs opacity-75'>
                  {new Date(alert.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {alerts.recentAlerts.length > 0 && (
        <div className='mt-4 pt-4 border-t border-gray-200'>
          <button className='text-sm text-primary-600 hover:text-primary-700 font-medium'>
            View All Alerts →
          </button>
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;
