import { Request, Response } from 'express';
import { AuthController } from '../../controllers/auth.controller';
import { AuthService } from '../../services/auth.service';
import { mockPrismaClient } from '../setup';
import { LoginRequest, AuthUser } from '../../types';

// Mock the AuthService
jest.mock('../../services/auth.service');

// Extend Request interface for testing
interface TestRequest extends Partial<Request> {
    user?: AuthUser;
}

describe('AuthController', () => {
    let authController: AuthController;
    let mockAuthService: jest.Mocked<AuthService>;
    let mockRequest: TestRequest;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        authController = new AuthController(mockPrismaClient);
        mockAuthService = authController['authService'] as jest.Mocked<AuthService>;

        mockRequest = {
            body: {},
            user: undefined,
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    describe('login', () => {
        it('should successfully login with valid credentials', async () => {
            const loginData: LoginRequest = {
                email: 'admin@example.com',
                password: 'password123',
            };

            const mockLoginResponse = {
                user: {
                    id: '1',
                    email: 'admin@example.com',
                    name: 'Admin User',
                    role: 'ADMIN' as const,
                },
                token: 'mock-jwt-token',
            };

            mockRequest.body = loginData;
            mockAuthService.login = jest.fn().mockResolvedValue(mockLoginResponse);

            await authController.login(mockRequest as Request, mockResponse as Response);

            expect(mockAuthService.login).toHaveBeenCalledWith(loginData);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockLoginResponse,
                message: 'Login successful',
            });
        });

        it('should return 400 when email is missing', async () => {
            mockRequest.body = { password: 'password123' };

            await authController.login(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Email and password are required',
            });
        });

        it('should return 400 when password is missing', async () => {
            mockRequest.body = { email: 'admin@example.com' };

            await authController.login(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Email and password are required',
            });
        });

        it('should return 401 when login fails', async () => {
            const loginData: LoginRequest = {
                email: 'admin@example.com',
                password: 'wrongpassword',
            };

            mockRequest.body = loginData;
            mockAuthService.login = jest.fn().mockRejectedValue(new Error('Invalid credentials'));

            await authController.login(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Invalid credentials',
            });
        });
    });

    describe('logout', () => {
        it('should successfully logout', async () => {
            await authController.logout(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Logout successful',
            });
        });
    });

    describe('me', () => {
        it('should return user information when authenticated', async () => {
            const mockUser: AuthUser = {
                id: '1',
                email: 'admin@example.com',
                name: 'Admin User',
                role: 'ADMIN',
            };

            mockRequest.user = mockUser;

            await authController.me(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockUser,
            });
        });

        it('should return 401 when user is not authenticated', async () => {
            mockRequest.user = undefined;

            await authController.me(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Authentication required',
            });
        });
    });
});