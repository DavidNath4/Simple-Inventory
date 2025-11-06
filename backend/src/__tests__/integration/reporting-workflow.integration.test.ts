import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../index';
import { UserRole, ActionType } from '../../types';

describe('Reporting Workflow Integration Tests', () => {
    let prisma: PrismaClient;
    let userToken: string;
    let adminToken: string;
    let testItemIds: string[] = [];

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
        
        await prisma.user.create({
            data: {
                name: 'Admin User',
                email: 'admin@test.com',
                password: hashedPassword,
                role: UserRole.ADMIN,
                isActive: true
            }
        });

        await prisma.user.create({
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

        // Create test inventory data for reporting
        const testItems = [
            {
                name: 'Report Test Item 1',
                sku: 'RPT-001',
                category: 'Electronics',
                stockLevel: 100,
                minStock: 10,
                maxStock: 500,
                unitPrice: 29.99,
                location: 'Warehouse A'
            },
            {
                name: 'Report Test Item 2',
                sku: 'RPT-002',
                category: 'Books',
                stockLevel: 50,
                minStock: 5,
                maxStock: 200,
                unitPrice: 15.99,
                location: 'Warehouse B'
            },
            {
                name: 'Report Test Item 3',
                sku: 'RPT-003',
                category: 'Electronics',
                stockLevel: 5, // Low stock
                minStock: 10,
                maxStock: 100,
                unitPrice: 45.99,
                location: 'Warehouse A'
            }
        ];

        for (const item of testItems) {
            const response = await request(app)
                .post('/api/inventory')
                .set('Authorization', `Bearer ${userToken}`)
                .send(item);
            testItemIds.push(response.body.data.id);
        }

        // Create some inventory actions for reporting
        await request(app)
            .post(`/api/inventory/${testItemIds[0]}/stock`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                quantity: 25,
                type: ActionType.ADD_STOCK,
                notes: 'Test stock addition'
            });

        await request(app)
            .post(`/api/inventory/${testItemIds[1]}/stock`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                quantity: 10,
                type: ActionType.REMOVE_STOCK,
                notes: 'Test stock removal'
            });
    });

    afterAll(async () => {
        // Clean up
        for (const itemId of testItemIds) {
            await request(app)
                .delete(`/api/inventory/${itemId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .catch(() => {}); // Ignore errors if already deleted
        }

        await prisma.auditLog.deleteMany();
        await prisma.inventoryAction.deleteMany();
        await prisma.inventoryItem.deleteMany();
        await prisma.user.deleteMany();
        await prisma.$disconnect();
    });

    describe('Complete Reporting Workflow', () => {
        it('should handle dashboard metrics generation', async () => {
            // Step 1: Get dashboard metrics
            const metricsResponse = await request(app)
                .get('/api/reports/dashboard')
                .set('Authorization', `Bearer ${userToken}`);

            expect(metricsResponse.status).toBe(200);
            expect(metricsResponse.body.success).toBe(true);
            expect(metricsResponse.body.data).toBeDefined();

            const metrics = metricsResponse.body.data;

            // Verify overview metrics
            expect(metrics.overview).toBeDefined();
            expect(metrics.overview.totalItems).toBeGreaterThanOrEqual(3);
            expect(metrics.overview.totalValue).toBeGreaterThan(0);
            expect(metrics.overview.totalCategories).toBeGreaterThanOrEqual(2);
            expect(metrics.overview.totalLocations).toBeGreaterThanOrEqual(2);
            expect(metrics.overview.lowStockCount).toBeGreaterThanOrEqual(1);

            // Verify performance metrics
            expect(metrics.performance).toBeDefined();
            expect(metrics.performance.averageStockLevel).toBeGreaterThan(0);

            // Verify trends data
            expect(metrics.trends).toBeDefined();
            expect(metrics.trends.stockMovements).toBeDefined();
            expect(metrics.trends.valueChanges).toBeDefined();

            // Verify alerts data
            expect(metrics.alerts).toBeDefined();
            expect(metrics.alerts.recentAlerts).toBeDefined();
        });

        it('should handle filtered dashboard metrics', async () => {
            // Test filtering by category
            const categoryMetricsResponse = await request(app)
                .get('/api/reports/dashboard?category=Electronics')
                .set('Authorization', `Bearer ${userToken}`);

            expect(categoryMetricsResponse.status).toBe(200);
            expect(categoryMetricsResponse.body.success).toBe(true);

            // Test filtering by location
            const locationMetricsResponse = await request(app)
                .get('/api/reports/dashboard?location=Warehouse A')
                .set('Authorization', `Bearer ${userToken}`);

            expect(locationMetricsResponse.status).toBe(200);
            expect(locationMetricsResponse.body.success).toBe(true);

            // Test filtering by date range
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            const endDate = new Date();

            const dateFilterResponse = await request(app)
                .get(`/api/reports/dashboard?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(dateFilterResponse.status).toBe(200);
            expect(dateFilterResponse.body.success).toBe(true);
        });

        it('should handle inventory report generation', async () => {
            // Step 1: Generate comprehensive inventory report
            const reportResponse = await request(app)
                .get('/api/reports/inventory')
                .set('Authorization', `Bearer ${userToken}`);

            expect(reportResponse.status).toBe(200);
            expect(reportResponse.body.success).toBe(true);
            expect(reportResponse.body.data).toBeDefined();

            const report = reportResponse.body.data;
            expect(report.items).toBeDefined();
            expect(report.items.length).toBeGreaterThanOrEqual(3);
            expect(report.summary).toBeDefined();
            expect(report.summary.totalItems).toBeGreaterThanOrEqual(3);
            expect(report.summary.totalValue).toBeGreaterThan(0);

            // Step 2: Generate filtered inventory report
            const filteredReportResponse = await request(app)
                .get('/api/reports/inventory?category=Electronics')
                .set('Authorization', `Bearer ${userToken}`);

            expect(filteredReportResponse.status).toBe(200);
            expect(filteredReportResponse.body.success).toBe(true);

            const filteredReport = filteredReportResponse.body.data;
            expect(filteredReport.items.every((item: any) => item.category === 'Electronics')).toBe(true);

            // Step 3: Generate report for specific item
            const itemReportResponse = await request(app)
                .get(`/api/reports/inventory?itemId=${testItemIds[0]}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(itemReportResponse.status).toBe(200);
            expect(itemReportResponse.body.success).toBe(true);

            const itemReport = itemReportResponse.body.data;
            expect(itemReport.items.length).toBe(1);
            expect(itemReport.items[0].id).toBe(testItemIds[0]);
        });

        it('should handle inventory metrics calculation', async () => {
            // Step 1: Get inventory metrics
            const metricsResponse = await request(app)
                .get('/api/reports/metrics')
                .set('Authorization', `Bearer ${userToken}`);

            expect(metricsResponse.status).toBe(200);
            expect(metricsResponse.body.success).toBe(true);
            expect(metricsResponse.body.data).toBeDefined();

            const metrics = metricsResponse.body.data;

            // Verify key performance indicators
            expect(metrics.stockTurnover).toBeDefined();
            expect(metrics.averageStockLevel).toBeGreaterThan(0);
            expect(metrics.stockAccuracy).toBeDefined();
            expect(metrics.topMovingItems).toBeDefined();
            expect(Array.isArray(metrics.topMovingItems)).toBe(true);

            // Verify category breakdown
            expect(metrics.categoryBreakdown).toBeDefined();
            expect(metrics.categoryBreakdown.Electronics).toBeDefined();
            expect(metrics.categoryBreakdown.Books).toBeDefined();

            // Verify location breakdown
            expect(metrics.locationBreakdown).toBeDefined();
            expect(metrics.locationBreakdown['Warehouse A']).toBeDefined();
            expect(metrics.locationBreakdown['Warehouse B']).toBeDefined();
        });

        it('should handle data export workflow', async () => {
            // Step 1: Export as CSV
            const csvExportResponse = await request(app)
                .get('/api/reports/export/csv')
                .set('Authorization', `Bearer ${userToken}`);

            expect(csvExportResponse.status).toBe(200);
            expect(csvExportResponse.headers['content-type']).toContain('text/csv');

            // Step 2: Export as JSON
            const jsonExportResponse = await request(app)
                .get('/api/reports/export/json')
                .set('Authorization', `Bearer ${userToken}`);

            expect(jsonExportResponse.status).toBe(200);
            expect(jsonExportResponse.headers['content-type']).toContain('application/json');

            // Step 3: Export as PDF
            const pdfExportResponse = await request(app)
                .get('/api/reports/export/pdf')
                .set('Authorization', `Bearer ${userToken}`);

            expect(pdfExportResponse.status).toBe(200);
            expect(pdfExportResponse.headers['content-type']).toContain('application/pdf');

            // Step 4: Export with filters
            const filteredCsvResponse = await request(app)
                .get('/api/reports/export/csv?category=Electronics')
                .set('Authorization', `Bearer ${userToken}`);

            expect(filteredCsvResponse.status).toBe(200);
            expect(filteredCsvResponse.headers['content-type']).toContain('text/csv');
        });

        it('should handle reporting error scenarios', async () => {
            // Test invalid export format
            const invalidFormatResponse = await request(app)
                .get('/api/reports/export/invalid')
                .set('Authorization', `Bearer ${userToken}`);

            expect(invalidFormatResponse.status).toBe(400);

            // Test invalid date range
            const invalidDateResponse = await request(app)
                .get('/api/reports/dashboard?startDate=invalid-date')
                .set('Authorization', `Bearer ${userToken}`);

            expect(invalidDateResponse.status).toBe(400);

            // Test invalid item ID in report
            const invalidItemResponse = await request(app)
                .get('/api/reports/inventory?itemId=invalid-id')
                .set('Authorization', `Bearer ${userToken}`);

            expect(invalidItemResponse.status).toBe(404);

            // Test unauthorized access
            const noAuthResponse = await request(app)
                .get('/api/reports/dashboard');

            expect(noAuthResponse.status).toBe(401);
        });

        it('should handle real-time reporting updates', async () => {
            // Step 1: Get initial metrics
            const initialMetricsResponse = await request(app)
                .get('/api/reports/dashboard')
                .set('Authorization', `Bearer ${userToken}`);

            const initialMetrics = initialMetricsResponse.body.data;

            // Step 2: Perform inventory action that should affect metrics
            const newItemResponse = await request(app)
                .post('/api/inventory')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    name: 'Metrics Test Item',
                    sku: 'METRICS-001',
                    category: 'Test Category',
                    stockLevel: 100,
                    minStock: 10,
                    unitPrice: 50.00,
                    location: 'Test Location'
                });

            const newItemId = newItemResponse.body.data.id;

            // Step 3: Get updated metrics
            const updatedMetricsResponse = await request(app)
                .get('/api/reports/dashboard')
                .set('Authorization', `Bearer ${userToken}`);

            const updatedMetrics = updatedMetricsResponse.body.data;

            // Verify metrics were updated
            expect(updatedMetrics.overview.totalItems).toBe(initialMetrics.overview.totalItems + 1);
            expect(updatedMetrics.overview.totalValue).toBeGreaterThan(initialMetrics.overview.totalValue);

            // Clean up
            await request(app)
                .delete(`/api/inventory/${newItemId}`)
                .set('Authorization', `Bearer ${userToken}`);
        });

        it('should handle complex reporting scenarios', async () => {
            // Test report generation with multiple filters
            const complexReportResponse = await request(app)
                .get('/api/reports/inventory?category=Electronics&location=Warehouse A&startDate=2023-01-01&endDate=2024-12-31')
                .set('Authorization', `Bearer ${userToken}`);

            expect(complexReportResponse.status).toBe(200);
            expect(complexReportResponse.body.success).toBe(true);

            // Test metrics with date range
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 1);
            const endDate = new Date();

            const dateRangeMetricsResponse = await request(app)
                .get(`/api/reports/metrics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(dateRangeMetricsResponse.status).toBe(200);
            expect(dateRangeMetricsResponse.body.success).toBe(true);

            // Test export with complex filters
            const complexExportResponse = await request(app)
                .get(`/api/reports/export/json?category=Electronics&startDate=${startDate.toISOString()}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(complexExportResponse.status).toBe(200);
            expect(complexExportResponse.headers['content-type']).toContain('application/json');
        });
    });
});