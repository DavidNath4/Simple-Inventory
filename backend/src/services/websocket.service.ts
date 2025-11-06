import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { AuthUser } from '../types';
import { AlertService } from './alert.service';

interface AuthenticatedSocket extends Socket {
  user?: AuthUser;
}

export class WebSocketService {
  private io: SocketIOServer;
  private alertService: AlertService;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();

  constructor(server: HttpServer, private prisma: PrismaClient) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.alertService = new AlertService(prisma);
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.use(this.authenticateSocket.bind(this));

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.user?.email} connected with socket ID: ${socket.id}`);
      
      // Store the authenticated socket
      if (socket.user) {
        this.connectedUsers.set(socket.user.id, socket);
      }

      // Join user to their personal room for targeted notifications
      if (socket.user) {
        socket.join(`user:${socket.user.id}`);
        socket.join(`role:${socket.user.role}`);
      }

      // Handle client requests for real-time data
      socket.on('subscribe:inventory', () => {
        socket.join('inventory:updates');
        console.log(`User ${socket.user?.email} subscribed to inventory updates`);
      });

      socket.on('subscribe:alerts', () => {
        socket.join('alerts:updates');
        console.log(`User ${socket.user?.email} subscribed to alert updates`);
      });

      socket.on('unsubscribe:inventory', () => {
        socket.leave('inventory:updates');
        console.log(`User ${socket.user?.email} unsubscribed from inventory updates`);
      });

      socket.on('unsubscribe:alerts', () => {
        socket.leave('alerts:updates');
        console.log(`User ${socket.user?.email} unsubscribed from alert updates`);
      });

      // Handle manual alert check request
      socket.on('check:alerts', async () => {
        try {
          const alerts = await this.alertService.getCurrentAlerts();
          socket.emit('alerts:update', alerts);
        } catch (error) {
          console.error('Error checking alerts:', error);
          socket.emit('error', { message: 'Failed to check alerts' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User ${socket.user?.email} disconnected`);
        if (socket.user) {
          this.connectedUsers.delete(socket.user.id);
        }
      });
    });
  }

  private async authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // Fetch user from database to ensure they're still active
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Invalid authentication token'));
    }
  }

  // Broadcast inventory updates to subscribed clients
  public broadcastInventoryUpdate(data: {
    type: 'created' | 'updated' | 'deleted' | 'stock_updated';
    item: any;
    userId?: string;
    details?: any;
  }) {
    this.io.to('inventory:updates').emit('inventory:update', {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast alerts to subscribed clients
  public broadcastAlert(alert: any) {
    this.io.to('alerts:updates').emit('alerts:new', {
      ...alert,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast alert updates (when alerts are resolved or acknowledged)
  public broadcastAlertUpdate(alerts: any[]) {
    this.io.to('alerts:updates').emit('alerts:update', {
      alerts,
      timestamp: new Date().toISOString()
    });
  }

  // Send notification to specific user
  public sendNotificationToUser(userId: string, notification: {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    data?: any;
  }) {
    this.io.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  // Send notification to users with specific role
  public sendNotificationToRole(role: 'ADMIN' | 'USER', notification: {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    data?: any;
  }) {
    this.io.to(`role:${role}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast system-wide notifications
  public broadcastSystemNotification(notification: {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    data?: any;
  }) {
    this.io.emit('system:notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  // Get connected users count
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get connected users by role
  public getConnectedUsersByRole(role: 'ADMIN' | 'USER'): AuthenticatedSocket[] {
    return Array.from(this.connectedUsers.values()).filter(socket => socket.user?.role === role);
  }

  // Check if user is connected
  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Periodic alert checking (called by scheduler)
  public async checkAndBroadcastAlerts() {
    try {
      const alerts = await this.alertService.getCurrentAlerts();
      
      if (alerts.length > 0) {
        this.broadcastAlertUpdate(alerts);
        
        // Send individual alerts for new critical items
        const criticalAlerts = alerts.filter(alert => alert.severity === 'CRITICAL' || alert.severity === 'OUT_OF_STOCK');
        
        criticalAlerts.forEach(alert => {
          this.broadcastAlert(alert);
        });
      }
    } catch (error) {
      console.error('Error checking and broadcasting alerts:', error);
    }
  }

  // Graceful shutdown
  public close() {
    this.io.close();
  }
}