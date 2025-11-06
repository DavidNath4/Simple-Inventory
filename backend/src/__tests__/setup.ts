import { PrismaClient } from '@prisma/client';

// Create mock functions
const createMockPrismaModel = () => ({
  create: jest.fn(),
  findUnique: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  groupBy: jest.fn(),
});

// Mock Prisma Client for testing
export const mockPrismaClient = {
  user: createMockPrismaModel(),
  inventoryItem: createMockPrismaModel(),
  inventoryAction: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
} as unknown as PrismaClient;

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});