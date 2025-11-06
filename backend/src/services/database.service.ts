import { PrismaClient } from '@prisma/client';
import { 
  UserRepository, 
  InventoryItemRepository, 
  InventoryActionRepository, 
  AuditLogRepository 
} from '../repositories';

export class DatabaseService {
  private static instance: DatabaseService;
  private prisma: PrismaClient;
  
  public readonly users: UserRepository;
  public readonly inventoryItems: InventoryItemRepository;
  public readonly inventoryActions: InventoryActionRepository;
  public readonly auditLogs: AuditLogRepository;

  private constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });

    // Initialize repositories
    this.users = new UserRepository(this.prisma);
    this.inventoryItems = new InventoryItemRepository(this.prisma);
    this.inventoryActions = new InventoryActionRepository(this.prisma);
    this.auditLogs = new AuditLogRepository(this.prisma);
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      console.log('Database disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect from database:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  public getPrismaClient(): PrismaClient {
    return this.prisma;
  }

  // Transaction support
  public async transaction<T>(
    fn: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>) => Promise<T>
  ): Promise<T> {
    return await this.prisma.$transaction(fn);
  }
}