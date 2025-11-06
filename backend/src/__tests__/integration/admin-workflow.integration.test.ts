import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../index';
import { UserRole } from '../../types';

describe('Admin Workflow Integration Tests', () => {
    let prisma: PrismaClient;
    let adminToken: string;
    let userToken: string;

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

        // Create test users
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

        const regularUser = await prisma.user.create({
            data: {
                name: 'Regular User',
                email: 'user@test.com',
                password: hashedPassword,
                role: UserRole.USER,
                isActive: true
            }
        });

        // Get tokens
        const adminLoginResponse = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@test.com', password: 'password123' });
        adminToken = adminLoginResponse.body.data.token;

        const userLoginResponse = await request(app)
            .post('/api/auth/login')
            .send({ email: 'user@test.com', password: 'password123' });
        userToken = userLoginResponse.body.data.token;
    });

    afterAll(async () => {
        await prisma.auditLog.deleteMany();
        await prisma.inventoryAction.deleteMany();
        await prisma.inventoryItem.deleteMany();
        await prisma.user.deleteMany();
        await prisma.$disconnect();
    });

    describe('Complete Admin Management Workflow', () => {
        it('should handle complete user management lifecycle', async () => {
            // Step 1: Admin creates new user
            const newUserData = {
                name: 'New Test User',
                email: 'newuser@test.com',
                password: 'password123',
                role: UserRole.USER
            };

            const createUserResponse = await request(app)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newUserData);

            expect(createUserResponse.status).toBe(201);
            expect(createUserResponse.body.success).toBe(true);
            expect(createUserResponse.body.data.email).toBe(newUserData.email);
            expect(createUserResponse.body.data.role).toBe(UserRole.USER);
            expect(createUserResponse.body.data.isActive).toBe(true);

            const newUserId = createUserResponse.body.data.id;

            // Step 2: Admin retrieves all users
            const getUsersResponse = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(getUsersResponse.status).toBe(200);
            expect(getUsersResponse.body.success).toBe(true);
            expect(getUsersResponse.body.data.length).toBeGreaterThanOrEqual(3); // admin, user, newuser

            // Step 3: Admin updates user information
            const updateUserData = {
                name: 'Updated Test User',
                role: UserRole.USER
            };

            const updateUserResponse = await request(app)
                .put(`/api/admin/users/${newUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateUserData);

            expect(updateUserResponse.status).toBe(200);
            expect(updateUserResponse.body.success).toBe(true);
            expect(updateUserResponse.body.data.name).toBe(updateUserData.name);

            // Step 4: Admin deactivates user
            const deactivateResponse = await request(app)
                .patch(`/api/admin/users/${newUserId}/deactivate`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(deactivateResponse.status).toBe(200);
            expect(deactivateResponse.body.success).toBe(true);
            expect(deactivateResponse.body.data.isActive).toBe(false);

            // Step 5: Verify deactivated user cannot login
            const deactivatedLoginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'newuser@test.com',
                    password: 'password123'
                });

            expect(deactivatedLoginResponse.status).toBe(401);

            // Step 6: Admin reactivates user
            const reactivateResponse = await request(app)
                .patch(`/api/admin/users/${newUserId}/activate`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(reactivateResponse.status).toBe(200);
            expect(reactivateResponse.body.success).toBe(true);
            expect(reactivateResponse.body.data.isActive).toBe(true);

            // Step 7: Verify reactivated user can login
            const reactivatedLoginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'newuser@test.com',
                    password: 'password123'
                });

            expect(reactivatedLoginResponse.status).toBe(200);
            expect(reactivatedLoginResponse.body.success).toBe(true);

            // Step 8: Admin deletes user
            const deleteUserResponse = await request(app)
                .delete(`/api/admin/users/${newUserId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(deleteUserResponse.status).toBe(200);
            expect(deleteUserResponse.body.success).toBe(true);

            // Step 9: Verify user is deleted
            const finalGetUsersResponse = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(finalGetUsersResponse.body.data.find((u: any) => u.id === newUserId)).toBeUndefined();
        });

        it('should handle audit logging workflow', async () => {
            // Step 1: Perform admin actions that should be audited
            const userData = {
                name: 'Audit Test User',
                email: 'audit@test.com',
                password: 'password123',
                role: UserRole.USER
            };

            const createResponse = await request(app)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(userData);

            const userId = createResponse.body.data.id;

            // Step 2: Update user (another audited action)
            await request(app)
                .put(`/api/admin/users/${userId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Updated Audit User' });

            // Step 3: Check audit logs
            const auditResponse = await request(app)
                .get('/api/audit/logs')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(auditResponse.status).toBe(200);
            expect(auditResponse.body.success).toBe(true);
            expect(auditResponse.body.data.length).toBeGreaterThan(0);

            // Verify audit log contains user creation and update
            const logs = auditResponse.body.data;
            const createLog = logs.find((log: any) => 
                log.action === 'CREATE_USER' && log.resourceId === userId
            );
            const updateLog = logs.find((log: any) => 
                log.action === 'UPDATE_USER' && log.resourceId === userId
            );

            expect(createLog).toBeDefined();
            expect(updateLog).toBeDefined();

            // Step 4: Filter audit logs by action
            const filteredAuditResponse = await request(app)
                .get('/api/audit/logs?action=CREATE_USER')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(filteredAuditResponse.status).toBe(200);
            expect(filteredAuditResponse.body.data.every((log: any) => log.action === 'CREATE_USER')).toBe(true);

            // Clean up
            await request(app)
                .delete(`/api/admin/users/${userId}`)
                .set('Authorization', `Bearer ${adminToken}`);
        });

        it('should handle admin authorization scenarios', async () => {
            // Test regular user cannot access admin routes
            const userAdminResponse = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${userToken}`);

            expect(userAdminResponse.status).toBe(403);

            // Test regular user cannot create users
            const userCreateResponse = await request(app)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    name: 'Unauthorized User',
                    email: 'unauthorized@test.com',
                    password: 'password123',
                    role: UserRole.USER
                });

            expect(userCreateResponse.status).toBe(403);

            // Test regular user cannot access audit logs
            const userAuditResponse = await request(app)
                .get('/api/audit/logs')
                .set('Authorization', `Bearer ${userToken}`);

            expect(userAuditResponse.status).toBe(403);

            // Test unauthenticated access
            const noAuthResponse = await request(app)
                .get('/api/admin/users');

            expect(noAuthResponse.status).toBe(401);
        });

        it('should handle admin error scenarios', async () => {
            // Test creating user with duplicate email
            const duplicateUserData = {
                name: 'Duplicate User',
                email: 'user@test.com', // Already exists
                password: 'password123',
                role: UserRole.USER
            };

            const duplicateResponse = await request(app)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(duplicateUserData);

            expect(duplicateResponse.status).toBe(409);
            expect(duplicateResponse.body.success).toBe(false);

            // Test updating non-existent user
            const updateNonExistentResponse = await request(app)
                .put('/api/admin/users/non-existent-id')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Updated Name' });

            expect(updateNonExistentResponse.status).toBe(404);

            // Test deleting non-existent user
            const deleteNonExistentResponse = await request(app)
                .delete('/api/admin/users/non-existent-id')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(deleteNonExistentResponse.status).toBe(404);

            // Test invalid user data
            const invalidUserResponse = await request(app)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: '', // Invalid empty name
                    email: 'invalid-email', // Invalid email format
                    password: '123', // Too short password
                    role: 'INVALID_ROLE' // Invalid role
                });

            expect(invalidUserResponse.status).toBe(400);
        });
    });

    describe('Admin Dashboard and Reporting', () => {
        it('should handle admin dashboard data retrieval', async () => {
            // Create some test data first
            const testItem = {
                name: 'Dashboard Test Item',
                sku: 'DASH-001',
                category: 'Electronics',
                stockLevel: 50,
                minStock: 10,
                unitPrice: 29.99,
                location: 'Warehouse A'
            };

            const itemResponse = await request(app)
                .post('/api/inventory')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(testItem);

            const itemId = itemResponse.body.data.id;

            // Test admin dashboard access
            const dashboardResponse = await request(app)
                .get('/api/admin/dashboard')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(dashboardResponse.status).toBe(200);
            expect(dashboardResponse.body.success).toBe(true);

            // Test regular user cannot access admin dashboard
            const userDashboardResponse = await request(app)
                .get('/api/admin/dashboard')
                .set('Authorization', `Bearer ${userToken}`);

            expect(userDashboardResponse.status).toBe(403);

            // Clean up
            await request(app)
                .delete(`/api/inventory/${itemId}`)
                .set('Authorization', `Bearer ${adminToken}`);
        });
    });
});