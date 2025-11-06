import React from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import ToastNotification from './ToastNotification';

const ToastContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className='fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-50'
      aria-live='assertive'
    >
      <div className='w-full flex flex-col items-center space-y-4 sm:items-end'>
        {notifications.map((notification) => (
          <ToastNotification
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
          />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;
