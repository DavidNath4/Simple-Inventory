import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../index';
import { UserRole } from '../../types';

describe('Authentication Workflow Integration Tests', () => {
    let prisma: PrismaClient;
    let server: any;

    beforeAll(async () => {
        prisma = new PrismaClient({
            datasources: {
                db: {
                    url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db'
                }
            }
        });

        // Clean up database
        await prisma.auditLog.deleteMany();
        await prisma.inventoryAction.deleteMany();
        await prisma.inventoryItem.deleteMany();
        await prisma.user.deleteMany();
    });

    afterAll(async () => {
        // Clean up
        await prisma.auditLog.deleteMany();
        await prisma.inventoryAction.deleteMany();
        await prisma.inventoryItem.deleteMany();
        await prisma.user.deleteMany();
        await prisma.$disconnect();
    });

    describe('Complete Authentication Flow', () => {
        it('should handle complete user registration and login workflow', async () => {
            // Step 1: Create admin user (simulating initial setup)
            const adminData = {
                name: 'Admin User',
                email: 'admin@test.com',
                password: 'password123',
                role: UserRole.ADMIN
            };

            const createAdminResponse = await request(app)
                .post('/api/admin/users')
                .send(adminData);

            expect(createAdminResponse.status).toBe(401); // Should fail without auth

            // Create admin directly in database for testing
            const hashedPassword = await require('bcryptjs').hash('password123', 10);
            const adminUser = await prisma.user.create({
                data: {
                    name: 'Admin User',
                    email: 'admin@test.com',
                    password: hashedPassword,
                    role: UserRole.ADMIN,
                    isActive: true
                }
            });

            // Step 2: Admin login
            const adminLoginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'admin@test.com',
                    password: 'password123'
                });

            expect(adminLoginResponse.status).toBe(200);
            expect(adminLoginResponse.body.success).toBe(true);
            expect(adminLoginResponse.body.data.token).toBeDefined();
            expect(adminLoginResponse.body.data.user.role).toBe(UserRole.ADMIN);

            const adminToken = adminLoginResponse.body.data.token;

            // Step 3: Admin creates regular user
            const userData = {
                name: 'Regular User',
                email: 'user@test.com',
                password: 'password123',
                role: UserRole.USER
            };

            const createUserResponse = await request(app)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(userData);

            expect(createUserResponse.status).toBe(201);
            expect(createUserResponse.body.success).toBe(true);
            expect(createUserResponse.body.data.email).toBe('user@test.com');

            // Step 4: Regular user login
            const userLoginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'user@test.com',
                    password: 'password123'
                });

            expect(userLoginResponse.status).toBe(200);
            expect(userLoginResponse.body.success).toBe(true);
            expect(userLoginResponse.body.data.user.role).toBe(UserRole.USER);

            const userToken = userLoginResponse.body.data.token;

            // Step 5: Verify user can access protected routes
            const meResponse = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${userToken}`);

            expect(meResponse.status).toBe(200);
            expect(meResponse.body.success).toBe(true);
            expect(meResponse.body.data.email).toBe('user@test.com');

            // Step 6: Verify user cannot access admin routes
            const adminRouteResponse = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${userToken}`);

            expect(adminRouteResponse.status).toBe(403);

            // Step 7: Logout
            const logoutResponse = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${userToken}`);

            expect(logoutResponse.status).toBe(200);
            expect(logoutResponse.body.success).toBe(true);
        });

        it('should handle authentication error scenarios', async () => {
            // Test invalid credentials
            const invalidLoginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'wrongpassword'
                });

            expect(invalidLoginResponse.status).toBe(401);
            expect(invalidLoginResponse.body.success).toBe(false);

            // Test missing credentials
            const missingCredsResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@test.com'
                });

            expect(missingCredsResponse.status).toBe(400);

            // Test invalid token
            const invalidTokenResponse = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token');

            expect(invalidTokenResponse.status).toBe(401);

            // Test missing token
            const missingTokenResponse = await request(app)
                .get('/api/auth/me');

            expect(missingTokenResponse.status).toBe(401);
        });
    });
});