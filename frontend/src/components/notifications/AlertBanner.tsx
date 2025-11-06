import React from 'react';
import { Alert } from '../../types';

interface AlertBannerProps {
  alert: Alert;
  onDismiss?: (id: string) => void;
  onAcknowledge?: (id: string) => void;
  className?: string;
}

const AlertBanner: React.FC<AlertBannerProps> = ({
  alert,
  onDismiss,
  onAcknowledge,
  className = '',
}) => {
  const getSeverityStyles = () => {
    switch (alert.severity) {
      case 'critical':
        return {
          container: 'bg-red-50 border-red-200 text-red-800',
          icon: '🚨',
          iconBg: 'bg-red-100',
          button: 'text-red-600 hover:text-red-800 focus:ring-red-500',
          badge: 'bg-red-100 text-red-800',
        };
      case 'high':
        return {
          container: 'bg-orange-50 border-orange-200 text-orange-800',
          icon: '⚠️',
          iconBg: 'bg-orange-100',
          button: 'text-orange-600 hover:text-orange-800 focus:ring-orange-500',
          badge: 'bg-orange-100 text-orange-800',
        };
      case 'medium':
        return {
          container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          icon: '⚠️',
          iconBg: 'bg-yellow-100',
          button: 'text-yellow-600 hover:text-yellow-800 focus:ring-yellow-500',
          badge: 'bg-yellow-100 text-yellow-800',
        };
      case 'low':
      default:
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-800',
          icon: 'ℹ️',
          iconBg: 'bg-blue-100',
          button: 'text-blue-600 hover:text-blue-800 focus:ring-blue-500',
          badge: 'bg-blue-100 text-blue-800',
        };
    }
  };

  const getTypeLabel = () => {
    switch (alert.type) {
      case 'low_stock':
        return 'Low Stock';
      case 'out_of_stock':
        return 'Out of Stock';
      case 'inventory_update':
        return 'Inventory Update';
      case 'system':
        return 'System Alert';
      default:
        return 'Alert';
    }
  };

  const styles = getSeverityStyles();

  return (
    <div
      className={`
        border rounded-lg p-4 ${styles.container} ${className}
        ${alert.acknowledged ? 'opacity-60' : ''}
      `}
      role='alert'
      aria-live='polite'
    >
      <div className='flex items-start'>
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${styles.iconBg}`}
        >
          <span className='text-sm' role='img' aria-hidden='true'>
            {styles.icon}
          </span>
        </div>

        <div className='ml-3 flex-1'>
          <div className='flex items-center space-x-2 mb-1'>
            <h4 className='text-sm font-medium'>{alert.title}</h4>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}
            >
              {getTypeLabel()}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}
            >
              {alert.severity.toUpperCase()}
            </span>
          </div>

          <p className='text-sm opacity-90 mb-2'>{alert.message}</p>

          {/* Item details for stock alerts */}
          {(alert.type === 'low_stock' || alert.type === 'out_of_stock') &&
            alert.itemName && (
              <div className='text-xs opacity-75 space-y-1'>
                <div className='flex items-center space-x-4'>
                  <span>
                    Item: <strong>{alert.itemName}</strong>
                  </span>
                  {alert.itemSku && (
                    <span>
                      SKU: <strong>{alert.itemSku}</strong>
                    </span>
                  )}
                </div>
                {alert.currentStock !== undefined &&
                  alert.minStock !== undefined && (
                    <div className='flex items-center space-x-4'>
                      <span>
                        Current Stock: <strong>{alert.currentStock}</strong>
                      </span>
                      <span>
                        Min Stock: <strong>{alert.minStock}</strong>
                      </span>
                      {alert.currentStock < alert.minStock && (
                        <span>
                          Shortage:{' '}
                          <strong>{alert.minStock - alert.currentStock}</strong>
                        </span>
                      )}
                    </div>
                  )}
                {alert.location && (
                  <span>
                    Location: <strong>{alert.location}</strong>
                  </span>
                )}
                {alert.category && (
                  <span>
                    Category: <strong>{alert.category}</strong>
                  </span>
                )}
              </div>
            )}

          <div className='text-xs opacity-60 mt-2'>
            {new Date(alert.createdAt).toLocaleString()}
          </div>
        </div>

        <div className='ml-4 flex-shrink-0 flex items-center space-x-2'>
          {!alert.acknowledged && onAcknowledge && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              className={`
                text-xs font-medium px-3 py-1 rounded-md border
                ${styles.button} bg-white bg-opacity-50 hover:bg-opacity-75
                focus:outline-none focus:ring-2 focus:ring-offset-2
              `}
              aria-label='Acknowledge alert'
            >
              Acknowledge
            </button>
          )}

          {alert.dismissible && onDismiss && (
            <button
              onClick={() => onDismiss(alert.id)}
              className={`
                inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2
                ${styles.button}
              `}
              aria-label='Dismiss alert'
            >
              <svg
                className='h-4 w-4'
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 20 20'
                fill='currentColor'
                aria-hidden='true'
              >
                <path
                  fillRule='evenodd'
                  d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
                  clipRule='evenodd'
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertBanner;
