import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createAuthRoutes } from './routes/auth.routes';
import { createAdminRoutes } from './routes/admin.routes';
import { createUserRoutes } from './routes/user.routes';
import { createInventoryRoutes } from './routes/inventory.routes';
import { createAuditRoutes } from './routes/audit.routes';
import { SchedulerService } from './services/scheduler.service';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize scheduler service for background monitoring
const schedulerService = new SchedulerService(prisma);

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', createAuthRoutes(prisma));
app.use('/api/admin', createAdminRoutes(prisma));
app.use('/api/users', createUserRoutes(prisma));
app.use('/api/inventory', createInventoryRoutes(prisma));
app.use('/api/audit', createAuditRoutes(prisma));

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Inventory Management API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  schedulerService.stopMonitoring();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  schedulerService.stopMonitoring();
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
  console.log(`📦 Inventory endpoints: http://localhost:${PORT}/api/inventory`);
  
  // Start background monitoring service (check every 30 minutes)
  const monitoringInterval = parseInt(process.env.MONITORING_INTERVAL_MINUTES || '30');
  schedulerService.startMonitoring(monitoringInterval);
});

export default app;