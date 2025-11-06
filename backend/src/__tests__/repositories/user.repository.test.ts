import { UserRepository } from '../../repositories/user.repository';
import { NotFoundError, ConflictError } from '../../repositories/base.repository';
import { UserRole } from '@prisma/client';
import { mockPrismaClient } from '../setup';

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepository(mockPrismaClient);
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        role: UserRole.USER,
      };

      const expectedUser = {
        id: 'user-123',
        ...userData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.user.create = jest.fn().mockResolvedValue(expectedUser);

      const result = await userRepository.create(userData);

      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: {
          email: userData.email,
          password: userData.password,
          name: userData.name,
          role: userData.role,
        },
      });
      expect(result).toEqual(expectedUser);
    });

    it('should create a user with default USER role when role is not specified', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
      };

      const expectedUser = {
        id: 'user-123',
        ...userData,
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.user.create = jest.fn().mockResolvedValue(expectedUser);

      await userRepository.create(userData);

      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: {
          email: userData.email,
          password: userData.password,
          name: userData.name,
          role: UserRole.USER,
        },
      });
    });

    it('should handle database errors during user creation', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
      };

      mockPrismaClient.user.create = jest.fn().mockRejectedValue({ code: 'P2002' });

      await expect(userRepository.create(userData)).rejects.toThrow(ConflictError);
    });
  });

  describe('findById', () => {
    it('should find a user by ID successfully', async () => {
      const userId = 'user-123';
      const expectedUser = {
        id: userId,
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.user.findUnique = jest.fn().mockResolvedValue(expectedUser);

      const result = await userRepository.findById(userId);

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toEqual(expectedUser);
    });

    it('should throw NotFoundError when user is not found', async () => {
      const userId = 'nonexistent-user';

      mockPrismaClient.user.findUnique = jest.fn().mockResolvedValue(null);

      await expect(userRepository.findById(userId)).rejects.toThrow(NotFoundError);
      await expect(userRepository.findById(userId)).rejects.toThrow('User with id nonexistent-user not found');
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email successfully', async () => {
      const email = 'test@example.com';
      const expectedUser = {
        id: 'user-123',
        email,
        password: 'hashedpassword',
        name: 'Test User',
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.user.findUnique = jest.fn().mockResolvedValue(expectedUser);

      const result = await userRepository.findByEmail(email);

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(result).toEqual(expectedUser);
    });

    it('should return null when user is not found by email', async () => {
      const email = 'nonexistent@example.com';

      mockPrismaClient.user.findUnique = jest.fn().mockResolvedValue(null);

      const result = await userRepository.findByEmail(email);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should find all active users by default', async () => {
      const expectedUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User 1',
          role: UserRole.USER,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          name: 'User 2',
          role: UserRole.ADMIN,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaClient.user.findMany = jest.fn().mockResolvedValue(expectedUsers);

      const result = await userRepository.findAll();

      expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(expectedUsers);
    });

    it('should find all users including inactive when specified', async () => {
      const expectedUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User 1',
          role: UserRole.USER,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          name: 'User 2',
          role: UserRole.USER,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaClient.user.findMany = jest.fn().mockResolvedValue(expectedUsers);

      const result = await userRepository.findAll(true);

      expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(expectedUsers);
    });
  });

  describe('update', () => {
    it('should update a user successfully', async () => {
      const userId = 'user-123';
      const updateData = {
        name: 'Updated Name',
        role: UserRole.ADMIN,
      };

      const expectedUser = {
        id: userId,
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Updated Name',
        role: UserRole.ADMIN,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.user.update = jest.fn().mockResolvedValue(expectedUser);

      const result = await userRepository.update(userId, updateData);

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
      });
      expect(result).toEqual(expectedUser);
    });
  });

  describe('delete', () => {
    it('should delete a user successfully', async () => {
      const userId = 'user-123';

      mockPrismaClient.user.delete = jest.fn().mockResolvedValue({});

      await userRepository.delete(userId);

      expect(mockPrismaClient.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });
  });

  describe('deactivate', () => {
    it('should deactivate a user successfully', async () => {
      const userId = 'user-123';
      const expectedUser = {
        id: userId,
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        role: UserRole.USER,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.user.update = jest.fn().mockResolvedValue(expectedUser);

      const result = await userRepository.deactivate(userId);

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { isActive: false },
      });
      expect(result).toEqual(expectedUser);
    });
  });

  describe('activate', () => {
    it('should activate a user successfully', async () => {
      const userId = 'user-123';
      const expectedUser = {
        id: userId,
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.user.update = jest.fn().mockResolvedValue(expectedUser);

      const result = await userRepository.activate(userId);

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { isActive: true },
      });
      expect(result).toEqual(expectedUser);
    });
  });
});