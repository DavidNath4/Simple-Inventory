import React, { useState } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { Alert } from '../../types';
import AlertBanner from './AlertBanner';

interface AlertListProps {
  className?: string;
  maxVisible?: number;
  showFilters?: boolean;
}

const AlertList: React.FC<AlertListProps> = ({
  className = '',
  maxVisible = 5,
  showFilters = true,
}) => {
  const { alerts, removeAlert, acknowledgeAlert } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unacknowledged' | 'critical'>(
    'all'
  );
  const [sortBy, setSortBy] = useState<'newest' | 'severity'>('newest');

  const filteredAlerts = alerts
    .filter((alert) => {
      switch (filter) {
        case 'unacknowledged':
          return !alert.acknowledged;
        case 'critical':
          return alert.severity === 'critical';
        default:
          return true;
      }
    })
    .sort((a, b) => {
      if (sortBy === 'severity') {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const visibleAlerts = filteredAlerts.slice(0, maxVisible);
  const hiddenCount = filteredAlerts.length - visibleAlerts.length;

  const getSeverityCount = (severity: Alert['severity']) => {
    return alerts.filter(
      (alert) => alert.severity === severity && !alert.acknowledged
    ).length;
  };

  if (alerts.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className='text-4xl mb-2'>✅</div>
        <p className='text-gray-500'>No active alerts</p>
        <p className='text-sm text-gray-400 mt-1'>
          All systems are running normally
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Alert Summary */}
      <div className='mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200'>
        <div className='flex items-center justify-between mb-2'>
          <h3 className='text-lg font-semibold text-gray-900'>System Alerts</h3>
          <div className='text-sm text-gray-600'>
            {alerts.filter((a) => !a.acknowledged).length} unacknowledged
          </div>
        </div>

        <div className='flex items-center space-x-4 text-sm'>
          <div className='flex items-center'>
            <div className='w-3 h-3 bg-red-500 rounded-full mr-2'></div>
            <span className='text-gray-600'>
              Critical ({getSeverityCount('critical')})
            </span>
          </div>
          <div className='flex items-center'>
            <div className='w-3 h-3 bg-orange-500 rounded-full mr-2'></div>
            <span className='text-gray-600'>
              High ({getSeverityCount('high')})
            </span>
          </div>
          <div className='flex items-center'>
            <div className='w-3 h-3 bg-yellow-500 rounded-full mr-2'></div>
            <span className='text-gray-600'>
              Medium ({getSeverityCount('medium')})
            </span>
          </div>
          <div className='flex items-center'>
            <div className='w-3 h-3 bg-blue-500 rounded-full mr-2'></div>
            <span className='text-gray-600'>
              Low ({getSeverityCount('low')})
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className='mb-4 flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <div>
              <label htmlFor='alert-filter' className='sr-only'>
                Filter alerts
              </label>
              <select
                id='alert-filter'
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className='text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              >
                <option value='all'>All Alerts</option>
                <option value='unacknowledged'>Unacknowledged</option>
                <option value='critical'>Critical Only</option>
              </select>
            </div>

            <div>
              <label htmlFor='alert-sort' className='sr-only'>
                Sort alerts
              </label>
              <select
                id='alert-sort'
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className='text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              >
                <option value='newest'>Newest First</option>
                <option value='severity'>By Severity</option>
              </select>
            </div>
          </div>

          {alerts.some((a) => !a.acknowledged) && (
            <button
              onClick={() =>
                alerts.forEach(
                  (alert) => !alert.acknowledged && acknowledgeAlert(alert.id)
                )
              }
              className='text-sm text-blue-600 hover:text-blue-800 font-medium'
            >
              Acknowledge All
            </button>
          )}
        </div>
      )}

      {/* Alert List */}
      <div className='space-y-3'>
        {visibleAlerts.map((alert) => (
          <AlertBanner
            key={alert.id}
            alert={alert}
            onDismiss={removeAlert}
            onAcknowledge={acknowledgeAlert}
          />
        ))}
      </div>

      {/* Show More Button */}
      {hiddenCount > 0 && (
        <div className='mt-4 text-center'>
          <button
            onClick={() => {
              // This could expand the list or navigate to a full alerts page
              console.log(`Show ${hiddenCount} more alerts`);
            }}
            className='text-sm text-blue-600 hover:text-blue-800 font-medium'
          >
            Show {hiddenCount} more alerts
          </button>
        </div>
      )}
    </div>
  );
};

export default AlertList;
