import { Request, Response } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import { InventoryController } from '../../controllers/inventory.controller';
import { mockPrismaClient } from '../setup';
import {
    CreateInventoryItemRequest,
    UpdateInventoryItemRequest,
    ActionType,
    AuthUser,
    InventoryItem
} from '../../types';

// Mock the validation utility
jest.mock('../../utils/validation', () => ({
    validateInventoryItem: jest.fn(),
    validateInventoryAction: jest.fn(),
}));

// Mock the services
jest.mock('../../repositories/inventory-item.repository');
jest.mock('../../repositories/inventory-action.repository');
jest.mock('../../services/alert.service');

interface TestRequest extends Partial<Request> {
    user?: AuthUser;
}

describe('InventoryController', () => {
    let inventoryController: InventoryController;
    let mockRequest: TestRequest;
    let mockResponse: Partial<Response>;

    const mockUser: AuthUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
    };

    const mockInventoryItem: InventoryItem = {
        id: 'item-1',
        name: 'Test Item',
        description: 'Test Description',
        sku: 'TEST-001',
        category: 'Electronics',
        stockLevel: 100,
        minStock: 10,
        maxStock: 500,
        unitPrice: new Decimal(29.99),
        location: 'Warehouse A',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(() => {
        inventoryController = new InventoryController(mockPrismaClient);

        mockRequest = {
            body: {},
            params: {},
            query: {},
            user: mockUser,
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        // Reset mocks
        jest.clearAllMocks();
    });

    describe('getInventoryItems', () => {
        it('should return paginated inventory items', async () => {
            const mockResult = {
                items: [mockInventoryItem],
                total: 1,
            };

            const mockRepository = inventoryController['inventoryRepository'];
            mockRepository.findAll = jest.fn().mockResolvedValue(mockResult);

            mockRequest.query = { page: '1', limit: '10' };

            await inventoryController.getInventoryItems(mockRequest as Request, mockResponse as Response);

            expect(mockRepository.findAll).toHaveBeenCalledWith(
                {
                    category: undefined,
                    location: undefined,
                    lowStock: false,
                    search: undefined,
                },
                { page: 1, limit: 10 }
            );

            expect(mockResponse.json).toHaveBeenCalledWith({
                data: [mockInventoryItem],
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 1,
                    totalPages: 1,
                },
            });
        });

        it('should handle filtering parameters', async () => {
            const mockResult = { items: [], total: 0 };
            const mockRepository = inventoryController['inventoryRepository'];
            mockRepository.findAll = jest.fn().mockResolvedValue(mockResult);

            mockRequest.query = {
                category: 'Electronics',
                location: 'Warehouse A',
                lowStock: 'true',
                search: 'test',
            };

            await inventoryController.getInventoryItems(mockRequest as Request, mockResponse as Response);

            expect(mockRepository.findAll).toHaveBeenCalledWith(
                {
                    category: 'Electronics',
                    location: 'Warehouse A',
                    lowStock: true,
                    search: 'test',
                },
                { page: 1, limit: 50 }
            );
        });

        it('should handle repository errors', async () => {
            const mockRepository = inventoryController['inventoryRepository'];
            mockRepository.findAll = jest.fn().mockRejectedValue(new Error('Database error'));

            await inventoryController.getInventoryItems(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to retrieve inventory items',
                message: 'Database error',
            });
        });
    });

    describe('getInventoryItem', () => {
        it('should return single inventory item', async () => {
            const mockRepository = inventoryController['inventoryRepository'];
            mockRepository.findById = jest.fn().mockResolvedValue(mockInventoryItem);

            mockRequest.params = { id: 'item-1' };

            await inventoryController.getInventoryItem(mockRequest as Request, mockResponse as Response);

            expect(mockRepository.findById).toHaveBeenCalledWith('item-1');
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockInventoryItem,
            });
        });

        it('should return 404 when item not found', async () => {
            const mockRepository = inventoryController['inventoryRepository'];
            mockRepository.findById = jest.fn().mockRejectedValue(new Error('Item not found'));

            mockRequest.params = { id: 'nonexistent' };

            await inventoryController.getInventoryItem(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to retrieve inventory item',
                message: 'Item not found',
            });
        });
    });

    describe('createInventoryItem', () => {
        const createData: CreateInventoryItemRequest = {
            name: 'New Item',
            description: 'New Description',
            sku: 'NEW-001',
            category: 'Electronics',
            stockLevel: 50,
            minStock: 5,
            maxStock: 200,
            unitPrice: 19.99,
            location: 'Warehouse B',
        };

        it('should create new inventory item successfully', async () => {
            const { validateInventoryItem } = require('../../utils/validation');
            validateInventoryItem.mockReturnValue({ isValid: true, errors: [] });

            const mockRepository = inventoryController['inventoryRepository'];
            mockRepository.findBySku = jest.fn().mockResolvedValue(null);
            mockRepository.create = jest.fn().mockResolvedValue({ ...mockInventoryItem, ...createData });

            mockRequest.body = createData;

            await inventoryController.createInventoryItem(mockRequest as Request, mockResponse as Response);

            expect(validateInventoryItem).toHaveBeenCalledWith(createData);
            expect(mockRepository.findBySku).toHaveBeenCalledWith('NEW-001');
            expect(mockRepository.create).toHaveBeenCalledWith(createData);
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining(createData),
                message: 'Inventory item created successfully',
            });
        });

        it('should return 400 for validation errors', async () => {
            const { validateInventoryItem } = require('../../utils/validation');
            validateInventoryItem.mockReturnValue({
                isValid: false,
                errors: ['Name is required', 'SKU is required']
            });

            mockRequest.body = {};

            await inventoryController.createInventoryItem(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Validation failed',
                message: 'Name is required, SKU is required',
            });
        });

        it('should return 409 for duplicate SKU', async () => {
            const { validateInventoryItem } = require('../../utils/validation');
            validateInventoryItem.mockReturnValue({ isValid: true, errors: [] });

            const mockRepository = inventoryController['inventoryRepository'];
            mockRepository.findBySku = jest.fn().mockResolvedValue(mockInventoryItem);

            mockRequest.body = createData;

            await inventoryController.createInventoryItem(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(409);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'SKU already exists',
                message: "An item with SKU 'NEW-001' already exists",
            });
        });
    });

    describe('updateInventoryItem', () => {
        const updateData: UpdateInventoryItemRequest = {
            name: 'Updated Item',
            description: 'Updated Description',
            unitPrice: 35.99,
        };

        it('should update inventory item successfully', async () => {
            const { validateInventoryItem } = require('../../utils/validation');
            validateInventoryItem.mockReturnValue({ isValid: true, errors: [] });

            const mockRepository = inventoryController['inventoryRepository'];
            mockRepository.update = jest.fn().mockResolvedValue({ ...mockInventoryItem, ...updateData });

            mockRequest.params = { id: 'item-1' };
            mockRequest.body = updateData;

            await inventoryController.updateInventoryItem(mockRequest as Request, mockResponse as Response);

            expect(validateInventoryItem).toHaveBeenCalledWith(updateData, false);
            expect(mockRepository.update).toHaveBeenCalledWith('item-1', updateData);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining(updateData),
                message: 'Inventory item updated successfully',
            });
        });

        it('should return 404 when item not found', async () => {
            const { validateInventoryItem } = require('../../utils/validation');
            validateInventoryItem.mockReturnValue({ isValid: true, errors: [] });

            const mockRepository = inventoryController['inventoryRepository'];
            mockRepository.update = jest.fn().mockRejectedValue(new Error('Item not found'));

            mockRequest.params = { id: 'nonexistent' };
            mockRequest.body = updateData;

            await inventoryController.updateInventoryItem(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
        });
    });

    describe('deleteInventoryItem', () => {
        it('should delete inventory item successfully', async () => {
            const mockRepository = inventoryController['inventoryRepository'];
            mockRepository.delete = jest.fn().mockResolvedValue(undefined);

            mockRequest.params = { id: 'item-1' };

            await inventoryController.deleteInventoryItem(mockRequest as Request, mockResponse as Response);

            expect(mockRepository.delete).toHaveBeenCalledWith('item-1');
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Inventory item deleted successfully',
            });
        });

        it('should return 404 when item not found', async () => {
            const mockRepository = inventoryController['inventoryRepository'];
            mockRepository.delete = jest.fn().mockRejectedValue(new Error('Item not found'));

            mockRequest.params = { id: 'nonexistent' };

            await inventoryController.deleteInventoryItem(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
        });
    });

    describe('updateStock', () => {
        it('should add stock successfully', async () => {
            const mockRepository = inventoryController['inventoryRepository'];
            const mockActionRepository = inventoryController['actionRepository'];

            mockRepository.findById = jest.fn().mockResolvedValue(mockInventoryItem);
            mockRepository.updateStock = jest.fn().mockResolvedValue({
                ...mockInventoryItem,
                stockLevel: 150
            });
            mockActionRepository.create = jest.fn().mockResolvedValue({});

            mockRequest.params = { id: 'item-1' };
            mockRequest.body = {
                quantity: 50,
                type: ActionType.ADD_STOCK,
                notes: 'Restocking',
            };

            await inventoryController.updateStock(mockRequest as Request, mockResponse as Response);

            expect(mockRepository.findById).toHaveBeenCalledWith('item-1');
            expect(mockRepository.updateStock).toHaveBeenCalledWith('item-1', 150);
            expect(mockActionRepository.create).toHaveBeenCalledWith(
                {
                    type: ActionType.ADD_STOCK,
                    quantity: 50,
                    notes: 'Restocking',
                    itemId: 'item-1',
                },
                'user-1'
            );
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining({ stockLevel: 150 }),
                message: 'Stock level updated successfully',
            });
        });

        it('should prevent removing more stock than available', async () => {
            const mockRepository = inventoryController['inventoryRepository'];
            mockRepository.findById = jest.fn().mockResolvedValue(mockInventoryItem);

            mockRequest.params = { id: 'item-1' };
            mockRequest.body = {
                quantity: 150, // More than current stock of 100
                type: ActionType.REMOVE_STOCK,
            };

            await inventoryController.updateStock(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Cannot remove more stock than available',
                message: 'Current stock: 100, requested removal: 150',
            });
        });

        it('should return 401 when user not authenticated', async () => {
            mockRequest.user = undefined;
            mockRequest.params = { id: 'item-1' };
            mockRequest.body = { quantity: 10, type: ActionType.ADD_STOCK };

            await inventoryController.updateStock(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'User authentication required',
            });
        });

        it('should validate quantity is positive integer', async () => {
            mockRequest.params = { id: 'item-1' };
            mockRequest.body = { quantity: -5, type: ActionType.ADD_STOCK };

            await inventoryController.updateStock(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Quantity must be a positive integer',
            });
        });

        it('should validate action type', async () => {
            mockRequest.params = { id: 'item-1' };
            mockRequest.body = { quantity: 10, type: 'INVALID_TYPE' };

            await inventoryController.updateStock(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Valid action type is required (ADD_STOCK, REMOVE_STOCK, ADJUST_STOCK, TRANSFER)',
            });
        });
    }); describe
        ('adjustStock', () => {
            it('should adjust stock level successfully', async () => {
                const mockRepository = inventoryController['inventoryRepository'];
                const mockActionRepository = inventoryController['actionRepository'];

                mockRepository.findById = jest.fn().mockResolvedValue(mockInventoryItem);
                mockRepository.updateStock = jest.fn().mockResolvedValue({
                    ...mockInventoryItem,
                    stockLevel: 75
                });
                mockActionRepository.create = jest.fn().mockResolvedValue({});

                mockRequest.params = { id: 'item-1' };
                mockRequest.body = {
                    stockLevel: 75,
                    notes: 'Manual adjustment',
                };

                await inventoryController.adjustStock(mockRequest as Request, mockResponse as Response);

                expect(mockRepository.updateStock).toHaveBeenCalledWith('item-1', 75);
                expect(mockActionRepository.create).toHaveBeenCalledWith(
                    {
                        type: ActionType.ADJUST_STOCK,
                        quantity: 25, // Difference between 100 and 75
                        notes: 'Manual adjustment',
                        itemId: 'item-1',
                    },
                    'user-1'
                );
            });

            it('should validate stock level is non-negative integer', async () => {
                mockRequest.params = { id: 'item-1' };
                mockRequest.body = { stockLevel: -10 };

                await inventoryController.adjustStock(mockRequest as Request, mockResponse as Response);

                expect(mockResponse.status).toHaveBeenCalledWith(400);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    success: false,
                    error: 'Stock level must be a non-negative integer',
                });
            });
        });

    describe('getCategories', () => {
        it('should return all categories', async () => {
            const mockCategories = ['Electronics', 'Clothing', 'Books'];
            const mockRepository = inventoryController['inventoryRepository'];
            mockRepository.getCategories = jest.fn().mockResolvedValue(mockCategories);

            await inventoryController.getCategories(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockCategories,
            });
        });
    });

    describe('getLocations', () => {
        it('should return all locations', async () => {
            const mockLocations = ['Warehouse A', 'Warehouse B', 'Store Front'];
            const mockRepository = inventoryController['inventoryRepository'];
            mockRepository.getLocations = jest.fn().mockResolvedValue(mockLocations);

            await inventoryController.getLocations(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockLocations,
            });
        });
    });

    describe('getLowStockItems', () => {
        it('should return low stock items', async () => {
            const lowStockItems = [{ ...mockInventoryItem, stockLevel: 5 }];
            const mockRepository = inventoryController['inventoryRepository'];
            mockRepository.findLowStockItems = jest.fn().mockResolvedValue(lowStockItems);

            await inventoryController.getLowStockItems(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: lowStockItems,
            });
        });
    });

    describe('getInventoryActions', () => {
        it('should return inventory actions for item', async () => {
            const mockActions = [
                {
                    id: 'action-1',
                    type: ActionType.ADD_STOCK,
                    quantity: 50,
                    notes: 'Initial stock',
                    createdAt: new Date(),
                },
            ];

            const mockRepository = inventoryController['inventoryRepository'];
            const mockActionRepository = inventoryController['actionRepository'];

            mockRepository.findById = jest.fn().mockResolvedValue(mockInventoryItem);
            mockActionRepository.findByItemId = jest.fn().mockResolvedValue({
                actions: mockActions,
                total: 1,
            });

            mockRequest.params = { id: 'item-1' };
            mockRequest.query = { page: '1', limit: '20' };

            await inventoryController.getInventoryActions(mockRequest as Request, mockResponse as Response);

            expect(mockActionRepository.findByItemId).toHaveBeenCalledWith('item-1', { page: 1, limit: 20 });
            expect(mockResponse.json).toHaveBeenCalledWith({
                data: mockActions,
                pagination: {
                    page: 1,
                    limit: 20,
                    total: 1,
                    totalPages: 1,
                },
            });
        });
    });

    describe('getAlerts', () => {
        it('should return all current alerts', async () => {
            const mockAlerts = [
                {
                    id: 'item-1',
                    name: 'Test Item',
                    sku: 'TEST-001',
                    stockLevel: 5,
                    minStock: 10,
                    severity: 'LOW',
                },
            ];

            const mockAlertService = inventoryController['alertService'];
            mockAlertService.getCurrentAlerts = jest.fn().mockResolvedValue(mockAlerts);

            await inventoryController.getAlerts(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockAlerts,
            });
        });

        it('should filter alerts by severity', async () => {
            const mockAlerts = [
                {
                    id: 'item-1',
                    name: 'Critical Item',
                    severity: 'CRITICAL',
                },
            ];

            const mockAlertService = inventoryController['alertService'];
            mockAlertService.getAlertsBySeverity = jest.fn().mockResolvedValue(mockAlerts);

            mockRequest.query = { severity: 'CRITICAL' };

            await inventoryController.getAlerts(mockRequest as Request, mockResponse as Response);

            expect(mockAlertService.getAlertsBySeverity).toHaveBeenCalledWith('CRITICAL');
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockAlerts,
            });
        });

        it('should return 400 for invalid severity', async () => {
            mockRequest.query = { severity: 'INVALID' };

            await inventoryController.getAlerts(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Invalid severity. Must be LOW, CRITICAL, or OUT_OF_STOCK',
            });
        });
    });

    describe('bulkUpdateItems', () => {
        const bulkUpdates = [
            { id: 'item-1', name: 'Updated Item 1', category: 'Electronics' },
            { id: 'item-2', name: 'Updated Item 2', category: 'Books' },
        ];

        it('should perform bulk update successfully', async () => {
            const { validateInventoryItem } = require('../../utils/validation');
            validateInventoryItem.mockReturnValue({ isValid: true, errors: [] });

            // Mock transaction
            const mockTransactionResult = [
                { ...mockInventoryItem, id: 'item-1', name: 'Updated Item 1' },
                { ...mockInventoryItem, id: 'item-2', name: 'Updated Item 2' },
            ];

            mockPrismaClient.$transaction = jest.fn().mockResolvedValue(mockTransactionResult);

            mockRequest.body = { updates: bulkUpdates };

            await inventoryController.bulkUpdateItems(mockRequest as Request, mockResponse as Response);

            expect(mockPrismaClient.$transaction).toHaveBeenCalled();
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockTransactionResult,
                message: 'Successfully updated 2 items',
            });
        });

        it('should return 400 for empty updates array', async () => {
            mockRequest.body = { updates: [] };

            await inventoryController.bulkUpdateItems(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Updates array is required and must not be empty',
            });
        });

        it('should return 400 for too many updates', async () => {
            const tooManyUpdates = Array(101).fill({ id: 'item-1', name: 'Test' });
            mockRequest.body = { updates: tooManyUpdates };

            await inventoryController.bulkUpdateItems(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Maximum 100 items can be updated in a single bulk operation',
            });
        });

        it('should return 400 for validation errors', async () => {
            const { validateInventoryItem } = require('../../utils/validation');
            validateInventoryItem.mockReturnValue({
                isValid: false,
                errors: ['Name is required']
            });

            mockRequest.body = { updates: [{ id: 'item-1' }] };

            await inventoryController.bulkUpdateItems(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Validation failed',
                message: 'Update 1: Name is required',
            });
        });
    });

    describe('bulkUpdateStock', () => {
        const stockUpdates = [
            { id: 'item-1', stockLevel: 150, type: ActionType.ADJUST_STOCK },
            { id: 'item-2', stockLevel: 75, type: ActionType.ADJUST_STOCK },
        ];

        it('should perform bulk stock update successfully', async () => {
            const mockTransactionResult = [
                { ...mockInventoryItem, id: 'item-1', stockLevel: 150 },
                { ...mockInventoryItem, id: 'item-2', stockLevel: 75 },
            ];

            mockPrismaClient.$transaction = jest.fn().mockImplementation(async (callback) => {
                const mockTx = {
                    inventoryItem: {
                        findUnique: jest.fn()
                            .mockResolvedValueOnce({ ...mockInventoryItem, id: 'item-1' })
                            .mockResolvedValueOnce({ ...mockInventoryItem, id: 'item-2' }),
                        update: jest.fn()
                            .mockResolvedValueOnce(mockTransactionResult[0])
                            .mockResolvedValueOnce(mockTransactionResult[1]),
                    },
                    inventoryAction: {
                        create: jest.fn().mockResolvedValue({}),
                    },
                };
                return callback(mockTx);
            });

            mockRequest.body = { updates: stockUpdates };

            await inventoryController.bulkUpdateStock(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockTransactionResult,
                message: 'Successfully updated stock levels for 2 items',
            });
        });

        it('should validate stock levels', async () => {
            const invalidUpdates = [{ id: 'item-1', stockLevel: -10 }];
            mockRequest.body = { updates: invalidUpdates };

            await inventoryController.bulkUpdateStock(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Validation failed',
                message: 'Update 1: Stock level must be a non-negative integer',
            });
        });
    });

    describe('bulkCreateItems', () => {
        const newItems = [
            {
                name: 'New Item 1',
                sku: 'NEW-001',
                category: 'Electronics',
                stockLevel: 50,
                minStock: 5,
                unitPrice: 29.99,
                location: 'Warehouse A',
            },
            {
                name: 'New Item 2',
                sku: 'NEW-002',
                category: 'Books',
                stockLevel: 25,
                minStock: 2,
                unitPrice: 15.99,
                location: 'Warehouse B',
            },
        ];

        it('should perform bulk create successfully', async () => {
            const { validateInventoryItem } = require('../../utils/validation');
            validateInventoryItem.mockReturnValue({ isValid: true, errors: [] });

            const mockRepository = inventoryController['inventoryRepository'];
            mockRepository.findAll = jest.fn().mockResolvedValue({ items: [], total: 0 });

            const mockTransactionResult = [
                { ...mockInventoryItem, ...newItems[0], id: 'new-item-1' },
                { ...mockInventoryItem, ...newItems[1], id: 'new-item-2' },
            ];

            mockPrismaClient.$transaction = jest.fn().mockImplementation(async (callback) => {
                const mockTx = {
                    inventoryItem: {
                        create: jest.fn()
                            .mockResolvedValueOnce(mockTransactionResult[0])
                            .mockResolvedValueOnce(mockTransactionResult[1]),
                    },
                    inventoryAction: {
                        create: jest.fn().mockResolvedValue({}),
                    },
                };
                return callback(mockTx);
            });

            mockRequest.body = { items: newItems };

            await inventoryController.bulkCreateItems(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockTransactionResult,
                message: 'Successfully created 2 items',
            });
        });

        it('should detect duplicate SKUs in batch', async () => {
            const duplicateItems = [
                { ...newItems[0] },
                { ...newItems[0] }, // Same SKU
            ];

            mockRequest.body = { items: duplicateItems };

            await inventoryController.bulkCreateItems(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Validation failed',
                message: expect.stringContaining("Duplicate SKU 'NEW-001' in batch"),
            });
        });

        it('should detect existing SKUs in database', async () => {
            const { validateInventoryItem } = require('../../utils/validation');
            validateInventoryItem.mockReturnValue({ isValid: true, errors: [] });

            const mockRepository = inventoryController['inventoryRepository'];
            mockRepository.findAll = jest.fn().mockResolvedValue({
                items: [{ ...mockInventoryItem, sku: 'NEW-001' }],
                total: 1
            });

            mockRequest.body = { items: newItems };

            await inventoryController.bulkCreateItems(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(409);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'SKU conflicts detected',
                message: 'The following SKUs already exist: NEW-001',
            });
        });

        it('should return 400 for too many items', async () => {
            const tooManyItems = Array(51).fill(newItems[0]);
            mockRequest.body = { items: tooManyItems };

            await inventoryController.bulkCreateItems(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Maximum 50 items can be created in a single bulk operation',
            });
        });
    });

    describe('bulkDeleteItems', () => {
        const itemIds = ['item-1', 'item-2', 'item-3'];

        it('should perform bulk delete successfully', async () => {
            mockPrismaClient.$transaction = jest.fn().mockImplementation(async (callback) => {
                const mockTx = {
                    inventoryAction: {
                        deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
                    },
                    inventoryItem: {
                        deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
                    },
                };
                return callback(mockTx);
            });

            mockRequest.body = { ids: itemIds };

            await inventoryController.bulkDeleteItems(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: { deletedCount: 3 },
                message: 'Successfully deleted 3 items',
            });
        });

        it('should return 400 for empty ids array', async () => {
            mockRequest.body = { ids: [] };

            await inventoryController.bulkDeleteItems(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'IDs array is required and must not be empty',
            });
        });

        it('should return 400 for too many ids', async () => {
            const tooManyIds = Array(51).fill('item-id');
            mockRequest.body = { ids: tooManyIds };

            await inventoryController.bulkDeleteItems(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Maximum 50 items can be deleted in a single bulk operation',
            });
        });

        it('should validate all ids are strings', async () => {
            const invalidIds = ['item-1', null, 'item-3'];
            mockRequest.body = { ids: invalidIds };

            await inventoryController.bulkDeleteItems(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'All IDs must be valid strings',
            });
        });
    });

    describe('monitorStockLevels', () => {
        it('should return stock monitoring results', async () => {
            const mockMonitoring = {
                outOfStock: [{ id: 'item-1', name: 'Out of Stock Item', stockLevel: 0 }],
                critical: [{ id: 'item-2', name: 'Critical Item', stockLevel: 2 }],
                lowStock: [{ id: 'item-3', name: 'Low Stock Item', stockLevel: 8 }],
            };

            const mockAlertService = inventoryController['alertService'];
            mockAlertService.monitorStockLevels = jest.fn().mockResolvedValue(mockMonitoring);

            await inventoryController.monitorStockLevels(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockMonitoring,
                message: 'Found 1 out of stock, 1 critical, and 1 low stock items',
            });
        });
    });

    describe('triggerAlertCheck', () => {
        it('should trigger alert check and return results', async () => {
            const mockAlerts = [
                { id: 'item-1', name: 'Low Stock Item', severity: 'LOW' },
            ];
            const mockStatistics = {
                total: 1,
                low: 1,
                critical: 0,
                outOfStock: 0,
            };

            const mockAlertService = inventoryController['alertService'];
            mockAlertService.generateLowStockAlerts = jest.fn().mockResolvedValue(mockAlerts);
            mockAlertService.getAlertStatistics = jest.fn().mockResolvedValue(mockStatistics);

            await inventoryController.triggerAlertCheck(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    alerts: mockAlerts,
                    statistics: mockStatistics,
                    timestamp: expect.any(Date),
                },
                message: 'Generated 1 alerts',
            });
        });
    });
});