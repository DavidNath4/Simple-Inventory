import { PrismaClient } from '@prisma/client';

export class DatabaseError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id?: string) {
    super(`${resource}${id ? ` with id ${id}` : ''} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export abstract class BaseRepository {
  protected prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  protected handleDatabaseError(error: any, operation: string): never {
    console.error(`Database error during ${operation}:`, error);

    // Handle Prisma-specific errors
    if (error.code === 'P2002') {
      throw new ConflictError('A record with this unique field already exists');
    }
    
    if (error.code === 'P2025') {
      throw new NotFoundError('Record');
    }
    
    if (error.code === 'P2003') {
      throw new DatabaseError('Foreign key constraint violation');
    }
    
    if (error.code === 'P2014') {
      throw new DatabaseError('Invalid ID provided');
    }

    // Generic database error
    throw new DatabaseError(`Database operation failed: ${operation}`, error);
  }
}