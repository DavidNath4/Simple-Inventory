import { BaseRepository, DatabaseError, NotFoundError, ConflictError } from '../../repositories/base.repository';
import { PrismaClient } from '@prisma/client';

// Create a concrete implementation of BaseRepository for testing
class TestRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  // Expose the protected method for testing
  public testHandleDatabaseError(error: any, operation: string): never {
    return this.handleDatabaseError(error, operation);
  }
}

describe('BaseRepository', () => {
  let testRepository: TestRepository;
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = {} as PrismaClient;
    testRepository = new TestRepository(mockPrisma);
  });

  describe('handleDatabaseError', () => {
    it('should throw ConflictError for P2002 (unique constraint violation)', () => {
      const prismaError = { code: 'P2002' };

      expect(() => testRepository.testHandleDatabaseError(prismaError, 'create user')).toThrow(ConflictError);
      expect(() => testRepository.testHandleDatabaseError(prismaError, 'create user')).toThrow('A record with this unique field already exists');
    });

    it('should throw NotFoundError for P2025 (record not found)', () => {
      const prismaError = { code: 'P2025' };

      expect(() => testRepository.testHandleDatabaseError(prismaError, 'find user')).toThrow(NotFoundError);
      expect(() => testRepository.testHandleDatabaseError(prismaError, 'find user')).toThrow('Record not found');
    });

    it('should throw DatabaseError for P2003 (foreign key constraint violation)', () => {
      const prismaError = { code: 'P2003' };

      expect(() => testRepository.testHandleDatabaseError(prismaError, 'delete user')).toThrow(DatabaseError);
      expect(() => testRepository.testHandleDatabaseError(prismaError, 'delete user')).toThrow('Foreign key constraint violation');
    });

    it('should throw DatabaseError for P2014 (invalid ID)', () => {
      const prismaError = { code: 'P2014' };

      expect(() => testRepository.testHandleDatabaseError(prismaError, 'find user')).toThrow(DatabaseError);
      expect(() => testRepository.testHandleDatabaseError(prismaError, 'find user')).toThrow('Invalid ID provided');
    });

    it('should throw generic DatabaseError for unknown error codes', () => {
      const prismaError = { code: 'P9999', message: 'Unknown error' };

      expect(() => testRepository.testHandleDatabaseError(prismaError, 'test operation')).toThrow(DatabaseError);
      expect(() => testRepository.testHandleDatabaseError(prismaError, 'test operation')).toThrow('Database operation failed: test operation');
    });

    it('should throw generic DatabaseError for errors without codes', () => {
      const genericError = new Error('Generic database error');

      expect(() => testRepository.testHandleDatabaseError(genericError, 'test operation')).toThrow(DatabaseError);
      expect(() => testRepository.testHandleDatabaseError(genericError, 'test operation')).toThrow('Database operation failed: test operation');
    });
  });

  describe('Error classes', () => {
    it('should create DatabaseError with correct properties', () => {
      const originalError = new Error('Original error');
      const dbError = new DatabaseError('Database failed', originalError);

      expect(dbError.name).toBe('DatabaseError');
      expect(dbError.message).toBe('Database failed');
      expect(dbError.originalError).toBe(originalError);
    });

    it('should create NotFoundError with correct properties', () => {
      const notFoundError = new NotFoundError('User', '123');

      expect(notFoundError.name).toBe('NotFoundError');
      expect(notFoundError.message).toBe('User with id 123 not found');
    });

    it('should create NotFoundError without ID', () => {
      const notFoundError = new NotFoundError('User');

      expect(notFoundError.name).toBe('NotFoundError');
      expect(notFoundError.message).toBe('User not found');
    });

    it('should create ConflictError with correct properties', () => {
      const conflictError = new ConflictError('Duplicate entry');

      expect(conflictError.name).toBe('ConflictError');
      expect(conflictError.message).toBe('Duplicate entry');
    });
  });
});