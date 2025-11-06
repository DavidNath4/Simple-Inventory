import React from 'react';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';

interface RealTimeStatusProps {
  className?: string;
  showText?: boolean;
}

export const RealTimeStatus: React.FC<RealTimeStatusProps> = ({ 
  className = '', 
  showText = true 
}) => {
  const { isConnected, getConnectionStatus } = useRealTimeUpdates({
    enableInventoryUpdates: false,
    enableAlerts: false
  });

  const status = getConnectionStatus();

  const getStatusColor = () => {
    if (status.connected) return 'text-green-500';
    if (status.connecting) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusText = () => {
    if (status.connected) return 'Real-time updates active';
    if (status.connecting) return 'Connecting...';
    if (status.reconnectAttempts > 0) {
      return `Reconnecting... (${status.reconnectAttempts}/${status.maxReconnectAttempts})`;
    }
    return 'Real-time updates offline';
  };

  const getStatusIcon = () => {
    if (status.connected) {
      return (
        <div className="relative">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <div className="absolute top-0 left-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
        </div>
      );
    }
    
    if (status.connecting) {
      return (
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
      );
    }
    
    return (
      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
    );
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {getStatusIcon()}
      {showText && (
        <span className={`text-sm ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      )}
    </div>
  );
};

export default RealTimeStatus;