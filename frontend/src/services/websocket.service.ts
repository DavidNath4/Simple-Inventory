import { io, Socket } from 'socket.io-client';
import { InventoryItem, Alert } from '../types';

interface WebSocketEvents {
  'inventory:update': (data: {
    type: 'created' | 'updated' | 'deleted' | 'stock_updated';
    item: InventoryItem;
    userId?: string;
    details?: any;
    timestamp: string;
  }) => void;
  
  'alerts:new': (alert: Alert & { timestamp: string }) => void;
  
  'alerts:update': (data: {
    alerts: Alert[];
    timestamp: string;
  }) => void;
  
  'notification': (notification: {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    data?: any;
    timestamp: string;
  }) => void;
  
  'system:notification': (notification: {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    data?: any;
    timestamp: string;
  }) => void;
  
  'error': (error: { message: string }) => void;
  'connect': () => void;
  'disconnect': () => void;
  'connect_error': (error: Error) => void;
}

export class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isConnecting = false;
  private eventListeners: Map<keyof WebSocketEvents, Function[]> = new Map();

  constructor(private serverUrl: string = process.env.REACT_APP_API_URL || 'http://localhost:3001') {
    // Initialize event listeners map
    Object.keys({} as WebSocketEvents).forEach(event => {
      this.eventListeners.set(event as keyof WebSocketEvents, []);
    });
  }

  // Connect to WebSocket server
  public connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        // Wait for current connection attempt
        const checkConnection = () => {
          if (this.socket?.connected) {
            resolve();
          } else if (!this.isConnecting) {
            reject(new Error('Connection failed'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
        return;
      }

      this.isConnecting = true;

      try {
        this.socket = io(this.serverUrl, {
          auth: {
            token
          },
          transports: ['websocket', 'polling'],
          timeout: 10000,
          forceNew: true
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.isConnecting = false;
          
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect(token);
          }
          
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason);
          this.isConnecting = false;
          
          // Auto-reconnect for certain disconnect reasons
          if (reason === 'io server disconnect') {
            // Server initiated disconnect, don't reconnect automatically
            return;
          }
          
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect(token);
          }
        });

        // Set up event forwarding
        this.setupEventForwarding();

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  // Disconnect from WebSocket server
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  // Check if connected
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Subscribe to inventory updates
  public subscribeToInventoryUpdates(): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:inventory');
    }
  }

  // Unsubscribe from inventory updates
  public unsubscribeFromInventoryUpdates(): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:inventory');
    }
  }

  // Subscribe to alert updates
  public subscribeToAlerts(): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:alerts');
    }
  }

  // Unsubscribe from alert updates
  public unsubscribeFromAlerts(): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:alerts');
    }
  }

  // Request manual alert check
  public checkAlerts(): void {
    if (this.socket?.connected) {
      this.socket.emit('check:alerts');
    }
  }

  // Add event listener
  public on<K extends keyof WebSocketEvents>(event: K, callback: WebSocketEvents[K]): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
  }

  // Remove event listener
  public off<K extends keyof WebSocketEvents>(event: K, callback: WebSocketEvents[K]): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(event, listeners);
    }
  }

  // Remove all event listeners for an event
  public removeAllListeners<K extends keyof WebSocketEvents>(event?: K): void {
    if (event) {
      this.eventListeners.set(event, []);
    } else {
      this.eventListeners.clear();
    }
  }

  // Setup event forwarding from socket to our event system
  private setupEventForwarding(): void {
    if (!this.socket) return;

    // Forward all events to our listeners
    const events: (keyof WebSocketEvents)[] = [
      'inventory:update',
      'alerts:new', 
      'alerts:update',
      'notification',
      'system:notification',
      'error',
      'connect',
      'disconnect',
      'connect_error'
    ];

    events.forEach(event => {
      this.socket!.on(event as string, (...args: any[]) => {
        const listeners = this.eventListeners.get(event) || [];
        listeners.forEach(listener => {
          try {
            listener(...args);
          } catch (error) {
            console.error(`Error in WebSocket event listener for ${event}:`, error);
          }
        });
      });
    });
  }

  // Schedule reconnection with exponential backoff
  private scheduleReconnect(token: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling WebSocket reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.socket?.connected && !this.isConnecting) {
        console.log(`Attempting WebSocket reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        this.connect(token).catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  // Get connection status
  public getStatus(): {
    connected: boolean;
    connecting: boolean;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
  } {
    return {
      connected: this.isConnected(),
      connecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService;