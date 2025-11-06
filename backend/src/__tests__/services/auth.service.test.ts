import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../services/auth.service';
import { UserRepository } from '../../repositories/user.repository';
import { mockPrismaClient } from '../setup';
import { LoginRequest, AuthUser } from '../../types';
import { User, UserRole } from '@prisma/client';

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../repositories/user.repository');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockBcrypt: jest.Mocked<typeof bcrypt>;
  let mockJwt: jest.Mocked<typeof jwt>;

  const mockUser: User = {
    id: '1',
    email: 'admin@example.com',
    password: 'hashedpassword',
    name: 'Admin User',
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Set up environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '24h';

    authService = new AuthService(mockPrismaClient);
    mockUserRepository = authService['userRepository'] as jest.Mocked<UserRepository>;
    mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
    mockJwt = jwt as jest.Mocked<typeof jwt>;
  });

  describe('login', () => {
    const loginRequest: LoginRequest = {
      email: 'admin@example.com',
      password: 'password123',
    };

    it('should successfully login with valid credentials', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.sign.mockReturnValue('mock-jwt-token' as never);

      const result = await authService.login(loginRequest);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('admin@example.com');
      expect(mockBcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          userId: '1',
          email: 'admin@example.com',
          role: 'ADMIN',
        },
        'test-secret',
        { expiresIn: '24h' }
      );

      expect(result).toEqual({
        user: {
          id: '1',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'ADMIN',
        },
        token: 'mock-jwt-token',
      });
    });

    it('should throw error when user is not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null as any);

      await expect(authService.login(loginRequest)).rejects.toThrow('Invalid credentials');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('admin@example.com');
    });

    it('should throw error when user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepository.findByEmail.mockResolvedValue(inactiveUser);

      await expect(authService.login(loginRequest)).rejects.toThrow('Account is deactivated');
    });

    it('should throw error when password is invalid', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(authService.login(loginRequest)).rejects.toThrow('Invalid credentials');
      expect(mockBcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
    });
  });

  describe('hashPassword', () => {
    it('should hash password with correct salt rounds', async () => {
      const password = 'password123';
      const hashedPassword = 'hashedpassword';

      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await authService.hashPassword(password);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token with correct payload', () => {
      mockJwt.sign.mockReturnValue('mock-jwt-token' as never);

      const result = authService.generateToken('1', 'admin@example.com', 'ADMIN');

      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          userId: '1',
          email: 'admin@example.com',
          role: 'ADMIN',
        },
        'test-secret',
        { expiresIn: '24h' }
      );
      expect(result).toBe('mock-jwt-token');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const mockPayload = {
        userId: '1',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      mockJwt.verify.mockReturnValue(mockPayload as never);

      const result = authService.verifyToken('valid-token');

      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(result).toBe(mockPayload);
    });

    it('should throw error for invalid token', () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => authService.verifyToken('invalid-token')).toThrow('Invalid or expired token');
    });
  });

  describe('getUserFromToken', () => {
    it('should return user from valid token', async () => {
      const mockPayload = {
        userId: '1',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      mockJwt.verify.mockReturnValue(mockPayload as never);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await authService.getUserFromToken('valid-token');

      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual({
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN',
      });
    });

    it('should throw error when user is not found', async () => {
      const mockPayload = {
        userId: '1',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      mockJwt.verify.mockReturnValue(mockPayload as never);
      mockUserRepository.findById.mockResolvedValue(null as any);

      await expect(authService.getUserFromToken('valid-token')).rejects.toThrow('User not found or inactive');
    });

    it('should throw error when user is inactive', async () => {
      const mockPayload = {
        userId: '1',
        email: 'admin@example.com',
        role: 'ADMIN',
      };
      const inactiveUser = { ...mockUser, isActive: false };

      mockJwt.verify.mockReturnValue(mockPayload as never);
      mockUserRepository.findById.mockResolvedValue(inactiveUser);

      await expect(authService.getUserFromToken('valid-token')).rejects.toThrow('User not found or inactive');
    });

    it('should throw error for invalid token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.getUserFromToken('invalid-token')).rejects.toThrow('Invalid or expired token');
    });
  });
});