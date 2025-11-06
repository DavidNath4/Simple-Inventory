import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from 'react';
import { Notification, Alert, NotificationContextType } from '../types';

interface NotificationState {
  notifications: Notification[];
  alerts: Alert[];
}

type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'ADD_ALERT'; payload: Alert }
  | { type: 'REMOVE_ALERT'; payload: string }
  | { type: 'ACKNOWLEDGE_ALERT'; payload: string }
  | { type: 'CLEAR_ALERTS' };

const initialState: NotificationState = {
  notifications: [],
  alerts: [],
};

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

function notificationReducer(
  state: NotificationState,
  action: NotificationAction
): NotificationState {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(
          (n) => n.id !== action.payload
        ),
      };
    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
      };
    case 'ADD_ALERT':
      // Prevent duplicate alerts for the same item
      const existingAlert = state.alerts.find(
        (a) =>
          a.itemId === action.payload.itemId && a.type === action.payload.type
      );
      if (existingAlert) {
        return state;
      }
      return {
        ...state,
        alerts: [...state.alerts, action.payload],
      };
    case 'REMOVE_ALERT':
      return {
        ...state,
        alerts: state.alerts.filter((a) => a.id !== action.payload),
      };
    case 'ACKNOWLEDGE_ALERT':
      return {
        ...state,
        alerts: state.alerts.map((a) =>
          a.id === action.payload ? { ...a, acknowledged: true } : a
        ),
      };
    case 'CLEAR_ALERTS':
      return {
        ...state,
        alerts: [],
      };
    default:
      return state;
  }
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'createdAt'>) => {
      const newNotification: Notification = {
        ...notification,
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        duration: notification.duration ?? 5000, // Default 5 seconds
      };

      dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });

      // Auto-remove notification after duration (if not persistent)
      if (newNotification.duration && newNotification.duration > 0) {
        setTimeout(() => {
          dispatch({
            type: 'REMOVE_NOTIFICATION',
            payload: newNotification.id,
          });
        }, newNotification.duration);
      }
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  const clearNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  }, []);

  const addAlert = useCallback((alert: Omit<Alert, 'id' | 'createdAt'>) => {
    const newAlert: Alert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      acknowledged: false,
      dismissible: alert.dismissible ?? true,
    };

    dispatch({ type: 'ADD_ALERT', payload: newAlert });
  }, []);

  const removeAlert = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ALERT', payload: id });
  }, []);

  const acknowledgeAlert = useCallback((id: string) => {
    dispatch({ type: 'ACKNOWLEDGE_ALERT', payload: id });
  }, []);

  const clearAlerts = useCallback(() => {
    dispatch({ type: 'CLEAR_ALERTS' });
  }, []);

  const value: NotificationContextType = {
    notifications: state.notifications,
    alerts: state.alerts,
    addNotification,
    removeNotification,
    clearNotifications,
    addAlert,
    removeAlert,
    acknowledgeAlert,
    clearAlerts,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    );
  }
  return context;
};
