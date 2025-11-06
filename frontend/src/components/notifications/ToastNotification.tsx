import React, { useEffect, useState } from 'react';
import { Notification } from '../../types';

interface ToastNotificationProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({
  notification,
  onRemove,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(notification.id);
    }, 300); // Match animation duration
  };

  const getTypeStyles = () => {
    switch (notification.type) {
      case 'success':
        return {
          container: 'bg-green-50 border-green-200 text-green-800',
          icon: '✅',
          iconBg: 'bg-green-100',
          button: 'text-green-600 hover:text-green-800 focus:ring-green-500',
        };
      case 'error':
        return {
          container: 'bg-red-50 border-red-200 text-red-800',
          icon: '❌',
          iconBg: 'bg-red-100',
          button: 'text-red-600 hover:text-red-800 focus:ring-red-500',
        };
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          icon: '⚠️',
          iconBg: 'bg-yellow-100',
          button: 'text-yellow-600 hover:text-yellow-800 focus:ring-yellow-500',
        };
      case 'info':
      default:
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-800',
          icon: 'ℹ️',
          iconBg: 'bg-blue-100',
          button: 'text-blue-600 hover:text-blue-800 focus:ring-blue-500',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isRemoving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        max-w-sm w-full bg-white shadow-lg rounded-lg border pointer-events-auto
        ${styles.container}
      `}
      role='alert'
      aria-live='polite'
      aria-atomic='true'
    >
      <div className='p-4'>
        <div className='flex items-start'>
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${styles.iconBg}`}
          >
            <span className='text-sm' role='img' aria-hidden='true'>
              {styles.icon}
            </span>
          </div>
          <div className='ml-3 w-0 flex-1'>
            <p className='text-sm font-medium'>{notification.title}</p>
            <p className='mt-1 text-sm opacity-90'>{notification.message}</p>
            {notification.actions && notification.actions.length > 0 && (
              <div className='mt-3 flex space-x-2'>
                {notification.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className={`
                      text-xs font-medium px-3 py-1 rounded-md
                      ${
                        action.variant === 'primary'
                          ? `${styles.button} bg-white bg-opacity-20 hover:bg-opacity-30`
                          : `${styles.button} underline hover:no-underline`
                      }
                      focus:outline-none focus:ring-2 focus:ring-offset-2
                    `}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className='ml-4 flex-shrink-0 flex'>
            <button
              onClick={handleRemove}
              className={`
                inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2
                ${styles.button}
              `}
              aria-label='Dismiss notification'
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToastNotification;
