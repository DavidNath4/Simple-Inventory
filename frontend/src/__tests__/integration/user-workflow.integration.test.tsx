import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import App from '../../App';
import { apiService } from '../../services/api';
import { User, UserRole, InventoryItem, DashboardMetrics } from '../../types';

// Mock API service
jest.mock('../../services/api', () => ({
    apiService: {
        login: jest.fn(),
        logout: jest.fn(),
        setToken: jest.fn(),
        getInventoryItems: jest.fn(),
        createInventoryItem: jest.fn(),
        updateInventoryItem: jest.fn(),
        deleteInventoryItem: jest.fn(),
        updateStock: jest.fn(),
        getDashboardMetrics: jest.fn(),
        getCategories: jest.fn(),
        getLocations: jest.fn(),
        getLowStockItems: jest.fn(),
        getAlerts: jest.fn(),
    },
}));

const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Mock WebSocket service
jest.mock('../../services/websocket.service', () => ({
    WebSocketService: jest.fn().mockImplementation(() => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
    })),
}));

// Mock react-router-dom navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

const renderApp = () => {
    return render(
        <BrowserRouter>
            <App />
        </BrowserRouter>
    );
};

describe('Complete User Workflow Integration Tests', () => {
    const mockUser: User = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.USER,
        isActive: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
    };

    const mockInventoryItem: InventoryItem = {
        id: '1',
        name: 'Test Widget',
        description: 'A test widget',
        sku: 'TEST-001',
        category: 'Electronics',
        stockLevel: 100,
        minStock: 10,
        maxStock: 500,
        unitPrice: 29.99,
        location: 'Warehouse A',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
    };

    const mockDashboardMetrics: DashboardMetrics = {
        overview: {
            totalItems: 150,
            totalValue: 25000,
            totalCategories: 8,
            totalLocations: 3,
            lowStockCount: 12,
            outOfStockCount: 3,
        },
        performance: {
            stockTurnover: 4.2,
            averageStockLevel: 45.6,
            stockAccuracy: 0.95,
            topMovingItems: [
                {
                    id: '1',
                    name: 'Widget A',
                    sku: 'WID-001',
                    totalMovements: 150,
                    netMovement: 25,
                },
            ],
        },
        trends: {
            stockMovements: [
                { date: '2023-01-01', stockIn: 50, stockOut: 30, netChange: 20 },
                { date: '2023-01-02', stockIn: 40, stockOut: 35, netChange: 5 },
            ],
            valueChanges: [
                { date: '2023-01-01', totalValue: 24000, valueChange: -500 },
                { date: '2023-01-02', totalValue: 24500, valueChange: 500 },
            ],
        },
        alerts: {
            criticalAlerts: 1,
            warningAlerts: 2,
            recentAlerts: [
                {
                    id: '1',
                    itemName: 'Widget A',
                    itemSku: 'WID-001',
                    currentStock: 5,
                    minStock: 10,
                    severity: 'warning' as const,
                    createdAt: '2023-01-01T00:00:00.000Z',
                },
            ],
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        mockNavigate.mockClear();
    });

    describe('Complete Login to Dashboard Workflow', () => {
        it('should handle complete user login and dashboard access workflow', async () => {
            const user = userEvent.setup();

            // Mock successful login
            mockApiService.login.mockResolvedValueOnce({
                success: true,
                data: {
                    user: mockUser,
                    token: 'mock-jwt-token',
                },
            });

            // Mock dashboard data
            mockApiService.getDashboardMetrics.mockResolvedValue({
                data: mockDashboardMetrics,
            });

            renderApp();

            // Step 1: User should see login page initially
            expect(screen.getByText('Inventory Management')).toBeInTheDocument();
            expect(screen.getByText('Sign in to your account to continue')).toBeInTheDocument();

            // Step 2: User enters credentials and logs in
            const emailField = screen.getByLabelText('Email Address');
            const passwordField = screen.getByLabelText('Password');
            const loginButton = screen.getByRole('button', { name: 'Sign In' });

            await user.type(emailField, 'john@example.com');
            await user.type(passwordField, 'password123');
            await user.click(loginButton);

            // Step 3: Verify login API call
            await waitFor(() => {
                expect(mockApiService.login).toHaveBeenCalledWith({
                    email: 'john@example.com',
                    password: 'password123',
                });
            });

            // Step 4: Verify token is set and user is redirected to dashboard
            expect(mockApiService.setToken).toHaveBeenCalledWith('mock-jwt-token');
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');

            // Step 5: Verify dashboard loads with metrics
            await waitFor(() => {
                expect(mockApiService.getDashboardMetrics).toHaveBeenCalled();
            });
        });

        it('should handle login error scenarios', async () => {
            const user = userEvent.setup();

            // Mock login failure
            mockApiService.login.mockRejectedValueOnce(new Error('Invalid credentials'));

            renderApp();

            // Enter invalid credentials
            const emailField = screen.getByLabelText('Email Address');
            const passwordField = screen.getByLabelText('Password');
            const loginButton = screen.getByRole('button', { name: 'Sign In' });

            await user.type(emailField, 'wrong@example.com');
            await user.type(passwordField, 'wrongpassword');
            await user.click(loginButton);

            // Verify error message is displayed
            await waitFor(() => {
                expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
            });

            // Verify user is not redirected
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    describe('Complete Inventory Management Workflow', () => {
        beforeEach(() => {
            // Mock authenticated state
            localStorage.setItem('auth_token', 'mock-jwt-token');
            
            // Mock API responses
            mockApiService.getInventoryItems.mockResolvedValue({
                data: [mockInventoryItem],
                pagination: {
                    page: 1,
                    limit: 50,
                    total: 1,
                    totalPages: 1,
                },
            });

            mockApiService.getCategories.mockResolvedValue({
                success: true,
                data: ['Electronics', 'Books', 'Clothing'],
            });

            mockApiService.getLocations.mockResolvedValue({
                success: true,
                data: ['Warehouse A', 'Warehouse B', 'Store Front'],
            });
        });

        it('should handle complete inventory item creation workflow', async () => {
            const user = userEvent.setup();

            // Mock successful item creation
            const newItem = {
                ...mockInventoryItem,
                id: '2',
                name: 'New Test Item',
                sku: 'NEW-001',
            };

            mockApiService.createInventoryItem.mockResolvedValueOnce({
                success: true,
                data: newItem,
            });

            // Mock updated inventory list
            mockApiService.getInventoryItems.mockResolvedValueOnce({
                data: [mockInventoryItem, newItem],
                pagination: {
                    page: 1,
                    limit: 50,
                    total: 2,
                    totalPages: 1,
                },
            });

            renderApp();

            // Navigate to inventory page (simulate authenticated state)
            window.history.pushState({}, 'Inventory', '/inventory');

            // Wait for inventory page to load
            await waitFor(() => {
                expect(screen.getByText('Inventory Management')).toBeInTheDocument();
            });

            // Step 1: Click "Add Item" button
            const addButton = screen.getByRole('button', { name: /add.*item/i });
            await user.click(addButton);

            // Step 2: Fill out the form
            await waitFor(() => {
                expect(screen.getByText('Add New Item')).toBeInTheDocument();
            });

            const nameField = screen.getByLabelText(/name/i);
            const skuField = screen.getByLabelText(/sku/i);
            const categoryField = screen.getByLabelText(/category/i);
            const stockField = screen.getByLabelText(/stock level/i);
            const priceField = screen.getByLabelText(/price/i);
            const locationField = screen.getByLabelText(/location/i);

            await user.type(nameField, 'New Test Item');
            await user.type(skuField, 'NEW-001');
            await user.selectOptions(categoryField, 'Electronics');
            await user.type(stockField, '50');
            await user.type(priceField, '39.99');
            await user.selectOptions(locationField, 'Warehouse A');

            // Step 3: Submit the form
            const submitButton = screen.getByRole('button', { name: /save/i });
            await user.click(submitButton);

            // Step 4: Verify API call and success
            await waitFor(() => {
                expect(mockApiService.createInventoryItem).toHaveBeenCalledWith({
                    name: 'New Test Item',
                    sku: 'NEW-001',
                    category: 'Electronics',
                    stockLevel: 50,
                    unitPrice: 39.99,
                    location: 'Warehouse A',
                    minStock: 0,
                    description: '',
                });
            });

            // Step 5: Verify inventory list is refreshed
            expect(mockApiService.getInventoryItems).toHaveBeenCalledTimes(2);
        });

        it('should handle inventory item update workflow', async () => {
            const user = userEvent.setup();

            // Mock successful update
            const updatedItem = {
                ...mockInventoryItem,
                name: 'Updated Test Widget',
                unitPrice: 35.99,
            };

            mockApiService.updateInventoryItem.mockResolvedValueOnce({
                success: true,
                data: updatedItem,
            });

            renderApp();

            // Navigate to inventory page
            window.history.pushState({}, 'Inventory', '/inventory');

            await waitFor(() => {
                expect(screen.getByText('Inventory Management')).toBeInTheDocument();
            });

            // Step 1: Find and click edit button for the item
            const editButton = screen.getByRole('button', { name: /edit/i });
            await user.click(editButton);

            // Step 2: Update form fields
            await waitFor(() => {
                expect(screen.getByText('Edit Item')).toBeInTheDocument();
            });

            const nameField = screen.getByDisplayValue('Test Widget');
            const priceField = screen.getByDisplayValue('29.99');

            await user.clear(nameField);
            await user.type(nameField, 'Updated Test Widget');
            await user.clear(priceField);
            await user.type(priceField, '35.99');

            // Step 3: Submit the update
            const updateButton = screen.getByRole('button', { name: /update/i });
            await user.click(updateButton);

            // Step 4: Verify API call
            await waitFor(() => {
                expect(mockApiService.updateInventoryItem).toHaveBeenCalledWith('1', {
                    name: 'Updated Test Widget',
                    unitPrice: 35.99,
                });
            });
        });

        it('should handle stock level update workflow', async () => {
            const user = userEvent.setup();

            // Mock successful stock update
            const updatedItem = {
                ...mockInventoryItem,
                stockLevel: 150,
            };

            mockApiService.updateStock.mockResolvedValueOnce({
                success: true,
                data: updatedItem,
            });

            renderApp();

            // Navigate to inventory page
            window.history.pushState({}, 'Inventory', '/inventory');

            await waitFor(() => {
                expect(screen.getByText('Inventory Management')).toBeInTheDocument();
            });

            // Step 1: Click stock update button
            const stockButton = screen.getByRole('button', { name: /update stock/i });
            await user.click(stockButton);

            // Step 2: Fill stock update form
            await waitFor(() => {
                expect(screen.getByText('Update Stock')).toBeInTheDocument();
            });

            const quantityField = screen.getByLabelText(/quantity/i);
            const typeField = screen.getByLabelText(/action type/i);
            const notesField = screen.getByLabelText(/notes/i);

            await user.type(quantityField, '50');
            await user.selectOptions(typeField, 'ADD_STOCK');
            await user.type(notesField, 'Restocking from supplier');

            // Step 3: Submit stock update
            const submitButton = screen.getByRole('button', { name: /update/i });
            await user.click(submitButton);

            // Step 4: Verify API call
            await waitFor(() => {
                expect(mockApiService.updateStock).toHaveBeenCalledWith('1', {
                    quantity: 50,
                    type: 'ADD_STOCK',
                    notes: 'Restocking from supplier',
                });
            });
        });

        it('should handle search and filter workflow', async () => {
            const user = userEvent.setup();

            renderApp();

            // Navigate to inventory page
            window.history.pushState({}, 'Inventory', '/inventory');

            await waitFor(() => {
                expect(screen.getByText('Inventory Management')).toBeInTheDocument();
            });

            // Step 1: Use search functionality
            const searchField = screen.getByPlaceholderText(/search/i);
            await user.type(searchField, 'Widget');

            // Verify search API call
            await waitFor(() => {
                expect(mockApiService.getInventoryItems).toHaveBeenCalledWith(
                    expect.objectContaining({
                        search: 'Widget',
                    })
                );
            });

            // Step 2: Use category filter
            const categoryFilter = screen.getByLabelText(/category/i);
            await user.selectOptions(categoryFilter, 'Electronics');

            // Verify filter API call
            await waitFor(() => {
                expect(mockApiService.getInventoryItems).toHaveBeenCalledWith(
                    expect.objectContaining({
                        category: 'Electronics',
                    })
                );
            });

            // Step 3: Use location filter
            const locationFilter = screen.getByLabelText(/location/i);
            await user.selectOptions(locationFilter, 'Warehouse A');

            // Verify combined filter API call
            await waitFor(() => {
                expect(mockApiService.getInventoryItems).toHaveBeenCalledWith(
                    expect.objectContaining({
                        category: 'Electronics',
                        location: 'Warehouse A',
                    })
                );
            });
        });

        it('should handle error scenarios in inventory management', async () => {
            const user = userEvent.setup();

            // Mock API error
            mockApiService.createInventoryItem.mockRejectedValueOnce(
                new Error('SKU already exists')
            );

            renderApp();

            // Navigate to inventory page
            window.history.pushState({}, 'Inventory', '/inventory');

            await waitFor(() => {
                expect(screen.getByText('Inventory Management')).toBeInTheDocument();
            });

            // Try to create item with duplicate SKU
            const addButton = screen.getByRole('button', { name: /add.*item/i });
            await user.click(addButton);

            await waitFor(() => {
                expect(screen.getByText('Add New Item')).toBeInTheDocument();
            });

            // Fill form with duplicate SKU
            const nameField = screen.getByLabelText(/name/i);
            const skuField = screen.getByLabelText(/sku/i);

            await user.type(nameField, 'Duplicate Item');
            await user.type(skuField, 'TEST-001'); // Same as existing item

            const submitButton = screen.getByRole('button', { name: /save/i });
            await user.click(submitButton);

            // Verify error message is displayed
            await waitFor(() => {
                expect(screen.getByText('SKU already exists')).toBeInTheDocument();
            });
        });
    });

    describe('Complete Navigation and Logout Workflow', () => {
        beforeEach(() => {
            localStorage.setItem('auth_token', 'mock-jwt-token');
            mockApiService.getDashboardMetrics.mockResolvedValue({
                data: mockDashboardMetrics,
            });
        });

        it('should handle complete navigation and logout workflow', async () => {
            const user = userEvent.setup();

            mockApiService.logout.mockResolvedValueOnce({
                success: true,
            });

            renderApp();

            // Navigate to dashboard
            window.history.pushState({}, 'Dashboard', '/dashboard');

            await waitFor(() => {
                expect(screen.getByText('Dashboard')).toBeInTheDocument();
            });

            // Step 1: Navigate to inventory page
            const inventoryLink = screen.getByRole('link', { name: /inventory/i });
            await user.click(inventoryLink);

            expect(mockNavigate).toHaveBeenCalledWith('/inventory');

            // Step 2: Navigate back to dashboard
            const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
            await user.click(dashboardLink);

            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');

            // Step 3: Logout
            const logoutButton = screen.getByRole('button', { name: /logout/i });
            await user.click(logoutButton);

            // Verify logout API call
            await waitFor(() => {
                expect(mockApiService.logout).toHaveBeenCalled();
            });

            // Verify redirect to login
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });

    describe('Real-time Updates Workflow', () => {
        beforeEach(() => {
            localStorage.setItem('auth_token', 'mock-jwt-token');
            mockApiService.getDashboardMetrics.mockResolvedValue({
                data: mockDashboardMetrics,
            });
            mockApiService.getAlerts.mockResolvedValue({
                success: true,
                data: [],
            });
        });

        it('should handle real-time alert notifications', async () => {
            renderApp();

            // Navigate to dashboard
            window.history.pushState({}, 'Dashboard', '/dashboard');

            await waitFor(() => {
                expect(screen.getByText('Dashboard')).toBeInTheDocument();
            });

            // Simulate receiving a real-time alert
            const alertData = {
                id: '1',
                itemName: 'Critical Item',
                itemSku: 'CRIT-001',
                currentStock: 2,
                minStock: 10,
                severity: 'critical' as const,
                createdAt: new Date().toISOString(),
            };

            // Mock updated alerts response
            mockApiService.getAlerts.mockResolvedValueOnce({
                success: true,
                data: [alertData],
            });

            // Trigger alert refresh (simulating WebSocket update)
            const refreshButton = screen.getByRole('button', { name: /refresh/i });
            if (refreshButton) {
                fireEvent.click(refreshButton);
            }

            // Verify alert appears in UI
            await waitFor(() => {
                expect(screen.getByText('Critical Item')).toBeInTheDocument();
            });
        });
    });
});