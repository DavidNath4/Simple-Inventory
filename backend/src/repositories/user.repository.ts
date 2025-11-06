import { PrismaClient, User, UserRole } from '@prisma/client';
import { BaseRepository, NotFoundError } from './base.repository';
import { CreateUserRequest, UpdateUserRequest } from '../types';

export class UserRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async create(data: CreateUserRequest): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: {
          email: data.email,
          password: data.password,
          name: data.name,
          role: data.role || UserRole.USER,
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, 'create user');
    }
  }

  async findById(id: string): Promise<User> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundError('User', id);
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.handleDatabaseError(error, 'find user by id');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { email },
      });
    } catch (error) {
      this.handleDatabaseError(error, 'find user by email');
    }
  }

  async findAll(includeInactive = false): Promise<User[]> {
    try {
      return await this.prisma.user.findMany({
        where: includeInactive ? {} : { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.handleDatabaseError(error, 'find all users');
    }
  }

  async update(id: string, data: UpdateUserRequest): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.handleDatabaseError(error, 'update user');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      this.handleDatabaseError(error, 'delete user');
    }
  }

  async deactivate(id: string): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (error) {
      this.handleDatabaseError(error, 'deactivate user');
    }
  }

  async activate(id: string): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: { isActive: true },
      });
    } catch (error) {
      this.handleDatabaseError(error, 'activate user');
    }
  }
}