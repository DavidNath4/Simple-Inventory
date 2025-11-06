import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../index';
import { UserRole, ActionType } from '../../types';

describe('Inventory Management Workflow Integration Tests', () => {
    let prisma: PrismaClient;
    let userToken: string;
    let adminToken: string;
    let testItemId: string;

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

    describe('Complete Inventory Management Workflow', () => {
        it('should handle complete inventory item lifecycle', async () => {
            // Step 1: Create inventory item
            const itemData = {
                name: 'Test Widget',
                description: 'A test widget for integration testing',
                sku: 'TEST-001',
                category: 'Electronics',
                stockLevel: 100,
                minStock: 10,
                maxStock: 500,
                unitPrice: 29.99,
                location: 'Warehouse A'
            };

            const createResponse = await request(app)
                .post('/api/inventory')
                .set('Authorization', `Bearer ${userToken}`)
                .send(itemData);

            expect(createResponse.status).toBe(201);
            expect(createResponse.body.success).toBe(true);
            expect(createResponse.body.data.name).toBe(itemData.name);
            expect(createResponse.body.data.sku).toBe(itemData.sku);

            testItemId = createResponse.body.data.id;

            // Step 2: Retrieve the created item
            const getResponse = await request(app)
                .get(`/api/inventory/${testItemId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(getResponse.status).toBe(200);
            expect(getResponse.body.success).toBe(true);
            expect(getResponse.body.data.id).toBe(testItemId);

            // Step 3: Update inventory item
            const updateData = {
                name: 'Updated Test Widget',
                description: 'Updated description',
                unitPrice: 35.99
            };

            const updateResponse = await request(app)
                .put(`/api/inventory/${testItemId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(updateData);

            expect(updateResponse.status).toBe(200);
            expect(updateResponse.body.success).toBe(true);
            expect(updateResponse.body.data.name).toBe(updateData.name);
            expect(updateResponse.body.data.unitPrice).toBe(updateData.unitPrice);

            // Step 4: Update stock levels
            const stockUpdateData = {
                quantity: 50,
                type: ActionType.ADD_STOCK,
                notes: 'Restocking from supplier'
            };

            const stockResponse = await request(app)
                .post(`/api/inventory/${testItemId}/stock`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(stockUpdateData);

            expect(stockResponse.status).toBe(200);
            expect(stockResponse.body.success).toBe(true);
            expect(stockResponse.body.data.stockLevel).toBe(150); // 100 + 50

            // Step 5: Verify inventory action was recorded
            const actionsResponse = await request(app)
                .get(`/api/inventory/${testItemId}/actions`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(actionsResponse.status).toBe(200);
            expect(actionsResponse.body.data.length).toBeGreaterThan(0);
            expect(actionsResponse.body.data[0].type).toBe(ActionType.ADD_STOCK);
            expect(actionsResponse.body.data[0].quantity).toBe(50);

            // Step 6: Adjust stock to specific level
            const adjustData = {
                stockLevel: 75,
                notes: 'Manual adjustment after inventory count'
            };

            const adjustResponse = await request(app)
                .post(`/api/inventory/${testItemId}/adjust`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(adjustData);

            expect(adjustResponse.status).toBe(200);
            expect(adjustResponse.body.success).toBe(true);
            expect(adjustResponse.body.data.stockLevel).toBe(75);

            // Step 7: Test low stock detection
            const lowStockAdjust = {
                stockLevel: 5, // Below minStock of 10
                notes: 'Testing low stock alert'
            };

            const lowStockResponse = await request(app)
                .post(`/api/inventory/${testItemId}/adjust`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(lowStockAdjust);

            expect(lowStockResponse.status).toBe(200);
            expect(lowStockResponse.body.data.stockLevel).toBe(5);

            // Step 8: Check alerts
            const alertsResponse = await request(app)
                .get('/api/inventory/alerts')
                .set('Authorization', `Bearer ${userToken}`);

            expect(alertsResponse.status).toBe(200);
            expect(alertsResponse.body.success).toBe(true);

            // Step 9: Get low stock items
            const lowStockItemsResponse = await request(app)
                .get('/api/inventory/low-stock')
                .set('Authorization', `Bearer ${userToken}`);

            expect(lowStockItemsResponse.status).toBe(200);
            expect(lowStockItemsResponse.body.success).toBe(true);
            expect(lowStockItemsResponse.body.data.some((item: any) => item.id === testItemId)).toBe(true);

            // Step 10: Delete inventory item
            const deleteResponse = await request(app)
                .delete(`/api/inventory/${testItemId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(deleteResponse.status).toBe(200);
            expect(deleteResponse.body.success).toBe(true);

            // Step 11: Verify item is deleted
            const getDeletedResponse = await request(app)
                .get(`/api/inventory/${testItemId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(getDeletedResponse.status).toBe(404);
        });

        it('should handle bulk operations workflow', async () => {
            // Step 1: Bulk create items
            const bulkItems = [
                {
                    name: 'Bulk Item 1',
                    sku: 'BULK-001',
                    category: 'Electronics',
                    stockLevel: 50,
                    minStock: 5,
                    unitPrice: 19.99,
                    location: 'Warehouse A'
                },
                {
                    name: 'Bulk Item 2',
                    sku: 'BULK-002',
                    category: 'Electronics',
                    stockLevel: 75,
                    minStock: 10,
                    unitPrice: 24.99,
                    location: 'Warehouse B'
                }
            ];

            const bulkCreateResponse = await request(app)
                .post('/api/inventory/bulk/create')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ items: bulkItems });

            expect(bulkCreateResponse.status).toBe(201);
            expect(bulkCreateResponse.body.success).toBe(true);
            expect(bulkCreateResponse.body.data.length).toBe(2);

            const createdIds = bulkCreateResponse.body.data.map((item: any) => item.id);

            // Step 2: Bulk update items
            const bulkUpdates = createdIds.map((id: string, index: number) => ({
                id,
                name: `Updated Bulk Item ${index + 1}`,
                category: 'Updated Electronics'
            }));

            const bulkUpdateResponse = await request(app)
                .post('/api/inventory/bulk/update')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ updates: bulkUpdates });

            expect(bulkUpdateResponse.status).toBe(200);
            expect(bulkUpdateResponse.body.success).toBe(true);
            expect(bulkUpdateResponse.body.data.length).toBe(2);

            // Step 3: Bulk stock update
            const stockUpdates = createdIds.map((id: string) => ({
                id,
                stockLevel: 100,
                type: ActionType.ADJUST_STOCK
            }));

            const bulkStockResponse = await request(app)
                .post('/api/inventory/bulk/stock')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ updates: stockUpdates });

            expect(bulkStockResponse.status).toBe(200);
            expect(bulkStockResponse.body.success).toBe(true);
            expect(bulkStockResponse.body.data.length).toBe(2);

            // Step 4: Bulk delete items
            const bulkDeleteResponse = await request(app)
                .post('/api/inventory/bulk/delete')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ ids: createdIds });

            expect(bulkDeleteResponse.status).toBe(200);
            expect(bulkDeleteResponse.body.success).toBe(true);
            expect(bulkDeleteResponse.body.data.deletedCount).toBe(2);
        });

        it('should handle inventory error scenarios', async () => {
            // Test duplicate SKU creation
            const itemData = {
                name: 'Test Item',
                sku: 'DUPLICATE-001',
                category: 'Electronics',
                stockLevel: 50,
                minStock: 5,
                unitPrice: 19.99,
                location: 'Warehouse A'
            };

            // Create first item
            const firstCreateResponse = await request(app)
                .post('/api/inventory')
                .set('Authorization', `Bearer ${userToken}`)
                .send(itemData);

            expect(firstCreateResponse.status).toBe(201);

            // Try to create duplicate SKU
            const duplicateResponse = await request(app)
                .post('/api/inventory')
                .set('Authorization', `Bearer ${userToken}`)
                .send(itemData);

            expect(duplicateResponse.status).toBe(409);
            expect(duplicateResponse.body.success).toBe(false);

            // Test invalid stock operations
            const itemId = firstCreateResponse.body.data.id;

            // Try to remove more stock than available
            const invalidStockResponse = await request(app)
                .post(`/api/inventory/${itemId}/stock`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    quantity: 100, // More than current stock of 50
                    type: ActionType.REMOVE_STOCK
                });

            expect(invalidStockResponse.status).toBe(400);
            expect(invalidStockResponse.body.success).toBe(false);

            // Test invalid item ID
            const invalidIdResponse = await request(app)
                .get('/api/inventory/invalid-id')
                .set('Authorization', `Bearer ${userToken}`);

            expect(invalidIdResponse.status).toBe(404);

            // Clean up
            await request(app)
                .delete(`/api/inventory/${itemId}`)
                .set('Authorization', `Bearer ${userToken}`);
        });

        it('should handle search and filtering workflow', async () => {
            // Create test items with different categories and locations
            const testItems = [
                {
                    name: 'Electronics Widget',
                    sku: 'ELEC-001',
                    category: 'Electronics',
                    stockLevel: 50,
                    minStock: 10,
                    unitPrice: 29.99,
                    location: 'Warehouse A'
                },
                {
                    name: 'Book Item',
                    sku: 'BOOK-001',
                    category: 'Books',
                    stockLevel: 25,
                    minStock: 5,
                    unitPrice: 15.99,
                    location: 'Warehouse B'
                },
                {
                    name: 'Electronics Gadget',
                    sku: 'ELEC-002',
                    category: 'Electronics',
                    stockLevel: 3, // Low stock
                    minStock: 10,
                    unitPrice: 45.99,
                    location: 'Warehouse A'
                }
            ];

            const createdItems = [];
            for (const item of testItems) {
                const response = await request(app)
                    .post('/api/inventory')
                    .set('Authorization', `Bearer ${userToken}`)
                    .send(item);
                createdItems.push(response.body.data);
            }

            // Test search by name
            const searchResponse = await request(app)
                .get('/api/inventory?search=Electronics')
                .set('Authorization', `Bearer ${userToken}`);

            expect(searchResponse.status).toBe(200);
            expect(searchResponse.body.data.length).toBe(2);

            // Test filter by category
            const categoryResponse = await request(app)
                .get('/api/inventory?category=Books')
                .set('Authorization', `Bearer ${userToken}`);

            expect(categoryResponse.status).toBe(200);
            expect(categoryResponse.body.data.length).toBe(1);
            expect(categoryResponse.body.data[0].category).toBe('Books');

            // Test filter by location
            const locationResponse = await request(app)
                .get('/api/inventory?location=Warehouse A')
                .set('Authorization', `Bearer ${userToken}`);

            expect(locationResponse.status).toBe(200);
            expect(locationResponse.body.data.length).toBe(2);

            // Test low stock filter
            const lowStockResponse = await request(app)
                .get('/api/inventory?lowStock=true')
                .set('Authorization', `Bearer ${userToken}`);

            expect(lowStockResponse.status).toBe(200);
            expect(lowStockResponse.body.data.length).toBe(1);
            expect(lowStockResponse.body.data[0].sku).toBe('ELEC-002');

            // Test pagination
            const paginatedResponse = await request(app)
                .get('/api/inventory?page=1&limit=2')
                .set('Authorization', `Bearer ${userToken}`);

            expect(paginatedResponse.status).toBe(200);
            expect(paginatedResponse.body.data.length).toBe(2);
            expect(paginatedResponse.body.pagination.page).toBe(1);
            expect(paginatedResponse.body.pagination.limit).toBe(2);

            // Clean up
            for (const item of createdItems) {
                await request(app)
                    .delete(`/api/inventory/${item.id}`)
                    .set('Authorization', `Bearer ${userToken}`);
            }
        });
    });
});