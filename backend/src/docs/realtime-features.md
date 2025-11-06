# Real-Time Features Documentation

## Overview

The Inventory Management System now includes real-time features using WebSocket connections to provide live updates for inventory changes and alerts.

## Features Implemented

### 1. Real-Time Inventory Updates
- **Inventory Item Creation**: Broadcasts when new items are added
- **Inventory Item Updates**: Broadcasts when items are modified
- **Inventory Item Deletion**: Broadcasts when items are removed
- **Stock Level Changes**: Broadcasts when stock levels are updated with details

### 2. Real-Time Alert System
- **Low Stock Alerts**: Automatic alerts when items fall below minimum stock
- **Out of Stock Alerts**: Critical alerts when items reach zero stock
- **Alert Broadcasting**: Real-time distribution of alerts to connected users

### 3. WebSocket Connection Management
- **Authentication**: JWT-based authentication for WebSocket connections
- **Auto-Reconnection**: Automatic reconnection with exponential backoff
- **Connection Status**: Real-time connection status indicators
- **User Rooms**: Role-based message targeting (Admin/User)

## Backend Implementation

### WebSocket Service (`backend/src/services/websocket.service.ts`)
- Handles WebSocket connections and authentication
- Manages user rooms and subscriptions
- Provides broadcasting methods for different event types
- Implements graceful shutdown and error handling

### Real-Time Routes (`backend/src/routes/realtime.routes.ts`)
- Test endpoints for development and debugging
- Connection status monitoring
- Manual broadcast triggers

### Updated Controllers
- Inventory controller now broadcasts updates on CRUD operations
- Stock updates trigger both inventory updates and alert checks
- Automatic alert generation on low stock conditions

## Frontend Implementation

### WebSocket Service (`frontend/src/services/websocket.service.ts`)
- Client-side WebSocket connection management
- Event handling and subscription management
- Automatic reconnection with status tracking
- Type-safe event system

### Real-Time Updates Hook (`frontend/src/hooks/useRealTimeUpdates.ts`)
- React hook for managing WebSocket connections
- Automatic subscription to inventory and alert updates
- Integration with notification system
- Callback support for custom handling

### Real-Time Status Component (`frontend/src/components/RealTimeStatus.tsx`)
- Visual indicator of WebSocket connection status
- Shows connection state (connected, connecting, offline)
- Displays reconnection attempts

### Updated Notification System
- Integration with real-time updates
- Automatic notifications for inventory changes
- Alert management with real-time updates
- Reduced polling frequency when real-time is active

## Usage

### Automatic Setup
Real-time features are automatically enabled when users log in:

```typescript
// In your React component
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';

const MyComponent = () => {
  const { isConnected } = useRealTimeUpdates({
    enableInventoryUpdates: true,
    enableAlerts: true,
    onInventoryUpdate: (data) => {
      // Handle inventory updates
      console.log('Inventory updated:', data);
    }
  });

  return (
    <div>
      Status: {isConnected ? 'Connected' : 'Disconnected'}
    </div>
  );
};
```

### Manual Alert Checking
```typescript
const { checkAlerts } = useInventoryNotifications();

// Manually trigger alert check
checkAlerts();
```

### Connection Status
```typescript
const { getConnectionStatus } = useRealTimeUpdates();

const status = getConnectionStatus();
console.log('Connected:', status.connected);
console.log('Reconnect attempts:', status.reconnectAttempts);
```

## Event Types

### Inventory Updates
```typescript
{
  type: 'created' | 'updated' | 'deleted' | 'stock_updated';
  item: InventoryItem;
  userId?: string;
  details?: {
    oldStock?: number;
    newStock?: number;
    quantity?: number;
    actionType?: ActionType;
  };
  timestamp: string;
}
```

### Alert Events
```typescript
{
  id: string;
  type: 'low_stock' | 'out_of_stock';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  itemId?: string;
  itemName?: string;
  currentStock?: number;
  minStock?: number;
  timestamp: string;
}
```

### Notifications
```typescript
{
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  data?: any;
  timestamp: string;
}
```

## Configuration

### Environment Variables
```env
# Backend
FRONTEND_URL=http://localhost:3000  # For CORS configuration
MONITORING_INTERVAL_MINUTES=5      # Alert checking interval

# Frontend
REACT_APP_API_URL=http://localhost:3001  # Backend URL for WebSocket connection
```

### WebSocket Settings
- **Connection Timeout**: 10 seconds
- **Reconnection Attempts**: 5 maximum
- **Reconnection Delay**: Exponential backoff starting at 1 second
- **Alert Check Interval**: 2 minutes (server-side)
- **Monitoring Interval**: 5 minutes (configurable)

## Development Testing

### Test Panel (Development Only)
A test panel is available on the Dashboard in development mode to test real-time functionality:

- **Test Notification**: Sends a system notification
- **Test Inventory Update**: Broadcasts a fake inventory update
- **Test Alert**: Sends a test alert
- **Check Status**: Shows current connection statistics

### API Endpoints for Testing
```
POST /api/realtime/test-broadcast
GET /api/realtime/status
```

## Performance Considerations

### Reduced Polling
When real-time connections are active:
- Alert checking interval increases from 5 to 10 minutes
- Dashboard refresh is triggered by real-time events
- Less frequent API calls reduce server load

### Connection Management
- Automatic cleanup on user logout
- Graceful handling of connection failures
- Memory-efficient event listener management

## Security

### Authentication
- JWT token validation for WebSocket connections
- User session verification on connection
- Automatic disconnection for inactive users

### Authorization
- Role-based message targeting
- User-specific notifications
- Admin-only system notifications

## Troubleshooting

### Connection Issues
1. Check network connectivity
2. Verify JWT token validity
3. Check server WebSocket service status
4. Review browser console for errors

### Missing Updates
1. Verify subscription status
2. Check WebSocket connection state
3. Test with manual refresh
4. Review server logs for broadcasting errors

### Performance Issues
1. Monitor connection count
2. Check for memory leaks in event listeners
3. Verify cleanup on component unmount
4. Review server resource usage

## Future Enhancements

### Planned Features
- User presence indicators
- Typing indicators for collaborative editing
- Real-time collaboration on inventory items
- Push notifications for mobile devices
- Advanced filtering for real-time events

### Scalability
- Redis adapter for multi-server deployments
- Message queuing for reliable delivery
- Connection pooling optimization
- Load balancing for WebSocket connections