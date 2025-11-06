import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { UserRepository } from '../repositories/user.repository';
import { LoginRequest, LoginResponse, AuthUser } from '../types';

export class AuthService {
    private userRepository: UserRepository;
    private jwtSecret: string;
    private jwtExpiresIn: string;

    constructor(prisma: PrismaClient) {
        this.userRepository = new UserRepository(prisma);
        this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    }

    async login(credentials: LoginRequest): Promise<LoginResponse> {
        const { email, password } = credentials;

        // Find user by email
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Check if user is active
        if (!user.isActive) {
            throw new Error('Account is deactivated');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }

        // Generate JWT token
        const token = this.generateToken(user.id, user.email, user.role);

        // Return user data and token
        const authUser: AuthUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        };

        return {
            user: authUser,
            token,
        };
    }

    async hashPassword(password: string): Promise<string> {
        const saltRounds = 12;
        return bcrypt.hash(password, saltRounds);
    }

    generateToken(userId: string, email: string, role: string): string {
        const payload = {
            userId,
            email,
            role,
        };

        return jwt.sign(payload, this.jwtSecret, { expiresIn: '24h' });
    }

    verifyToken(token: string): any {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    async getUserFromToken(token: string): Promise<AuthUser> {
        const decoded = this.verifyToken(token);
        const user = await this.userRepository.findById(decoded.userId);

        if (!user || !user.isActive) {
            throw new Error('User not found or inactive');
        }

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        };
    }
}