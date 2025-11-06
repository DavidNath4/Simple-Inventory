import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import App from '../../App';
import { apiService } from '../../services/api';
import { User, UserRole, InventoryItem, DashboardMetrics } from '../../types';

// Mock API service with comprehensive responses
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
        adjustStock: jest.fn(),
        getDashboardMetrics: jest.fn(),
        getCategories: jest.fn(),
        getLocations: jest.fn(),
        getLowStockItems: jest.fn(),
        getAlerts: jest.fn(),
        getUsers: jest.fn(),
        createUser: jest.fn(),
        updateUser: jest.fn(),
        deleteUser: jest.fn(),
        getAdminDashboard: jest.fn(),
        getInventoryReport: jest.fn(),
        exportInventoryReport: jest.fn(),
        bulkUpdateItems: jest.fn(),
        bulkCreateItems: jest.fn(),
        bulkDeleteItems: jest.fn(),
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
        emit: jest.fn(),
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

describe('End-to-End Application Integration Tests', () => {
    const mockAdminUser: User = {
        id: '1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        isActive: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
    };

    const mockRegularUser: User = {
        id: '2',
        name: 'Regular User',
        email: 'user@example.com',
        role: UserRole.USER,
        isActive: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
    };

    const mockInventoryItems: InventoryItem[] = [
        {
            id: '1',
            name: 'Widget A',
            description: 'High-quality widget',
            sku: 'WID-001',
            category: 'Electronics',
            stockLevel: 100,
            minStock: 10,
            maxStock: 500,
            unitPrice: 29.99,
            location: 'Warehouse A',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
        },
        {
            id: '2',
            name: 'Book B',
            description: 'Educational book',
            sku: 'BOOK-001',
            category: 'Books',
            stockLevel: 5, // Low stock
            minStock: 10,
            maxStock: 200,
            unitPrice: 15.99,
            location: 'Warehouse B',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
        },
    ];

    const mockDashboardMetrics: DashboardMetrics = {
        overview: {
            totalItems: 2,
            totalValue: 3079.95,
            totalCategories: 2,
            totalLocations: 2,
            lowStockCount: 1,
            outOfStockCount: 0,
        },
        performance: {
            stockTurnover: 4.2,
            averageStockLevel: 52.5,
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
                { date: '2023-01-01', totalValue: 3000, valueChange: -79.95 },
                { date: '2023-01-02', totalValue: 3079.95, valueChange: 79.95 },
            ],
        },
        alerts: {
            criticalAlerts: 0,
            warningAlerts: 1,
            recentAlerts: [
                {
                    id: '2',
                    itemName: 'Book B',
                    itemSku: 'BOOK-001',
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

        // Setup default API responses
        mockApiService.getCategories.mockResolvedValue({
            success: true,
            data: ['Electronics', 'Books', 'Clothing'],
        });

        mockApiService.getLocations.mockResolvedValue({
            success: true,
            data: ['Warehouse A', 'Warehouse B', 'Store Front'],
        });

        mockApiService.getAlerts.mockResolvedValue({
            success: true,
            data: mockDashboardMetrics.alerts.recentAlerts,
        });

        mockApiService.getLowStockItems.mockResolvedValue({
            success: true,
            data: [mockInventoryItems[1]], // Book B is low stock
        });
    });

    describe('Complete Business Workflow - Regular User Journey', () => {
        it('should handle complete user journey from login to inventory management', async () => {
            const user = userEvent.setup();

            // Setup API responses for user workflow
            mockApiService.login.mockResolvedValueOnce({
                success: true,
                data: {
                    user: mockRegularUser,
                    token: 'user-jwt-token',
                },
            });

            mockApiService.getDashboardMetrics.mockResolvedValue({
                data: mockDashboardMetrics,
            });

            mockApiService.getInventoryItems.mockResolvedValue({
                data: mockInventoryItems,
                pagination: {
                    page: 1,
                    limit: 50,
                    total: 2,
                    totalPages: 1,
                },
            });

            renderApp();

            // === PHASE 1: LOGIN ===
            expect(screen.getByText('Inventory Management')).toBeInTheDocument();
            expect(screen.getByText('Sign in to your account to continue')).toBeInTheDocument();

            const emailField = screen.getByLabelText('Email Address');
            const passwordField = screen.getByLabelText('Password');
            const loginButton = screen.getByRole('button', { name: 'Sign In' });

            await user.type(emailField, 'user@example.com');
            await user.type(passwordField, 'password123');
            await user.click(loginButton);

            // Verify login process
            await waitFor(() => {
                expect(mockApiService.login).toHaveBeenCalledWith({
                    email: 'user@example.com',
                    password: 'password123',
                });
            });

            expect(mockApiService.setToken).toHaveBeenCalledWith('user-jwt-token');
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');

            // === PHASE 2: DASHBOARD OVERVIEW ===
            window.history.pushState({}, 'Dashboard', '/dashboard');

            await waitFor(() => {
                expect(mockApiService.getDashboardMetrics).toHaveBeenCalled();
            });

            // Verify dashboard content loads
            await waitFor(() => {
                expect(screen.getByText('Dashboard')).toBeInTheDocument();
                expect(screen.getByText('Total Items')).toBeInTheDocument();
                expect(screen.getByText('2')).toBeInTheDocument(); // totalItems
                expect(screen.getByText('Low Stock Items')).toBeInTheDocument();
                expect(screen.getByText('1')).toBeInTheDocument(); // lowStockCount
            });

            // === PHASE 3: NAVIGATE TO INVENTORY ===
            const inventoryLink = screen.getByRole('link', { name: /inventory/i });
            await user.click(inventoryLink);

            expect(mockNavigate).toHaveBeenCalledWith('/inventory');

            // Simulate navigation to inventory page
            window.history.pushState({}, 'Inventory', '/inventory');

            await waitFor(() => {
                expect(mockApiService.getInventoryItems).toHaveBeenCalled();
            });

            // Verify inventory page loads
            await waitFor(() => {
                expect(screen.getByText('Inventory Management')).toBeInTheDocument();
                expect(screen.getByText('Widget A')).toBeInTheDocument();
                expect(screen.getByText('Book B')).toBeInTheDocument();
                expect(screen.getByText('WID-001')).toBeInTheDocument();
                expect(screen.getByText('BOOK-001')).toBeInTheDocument();
            });

            // === PHASE 4: CREATE NEW INVENTORY ITEM ===
            const newItem: InventoryItem = {
                id: '3',
                name: 'New Product C',
                description: 'Newly added product',
                sku: 'NEW-001',
                category: 'Electronics',
                stockLevel: 75,
                minStock: 15,
                maxStock: 300,
                unitPrice: 45.99,
                location: 'Warehouse A',
                createdAt: '2023-01-01T00:00:00.000Z',
                updatedAt: '2023-01-01T00:00:00.000Z',
            };

            mockApiService.createInventoryItem.mockResolvedValueOnce({
                success: true,
                data: newItem,
            });

            mockApiService.getInventoryItems.mockResolvedValueOnce({
                data: [...mockInventoryItems, newItem],
                pagination: {
                    page: 1,
                    limit: 50,
                    total: 3,
                    totalPages: 1,
                },
            });

            const addItemButton = screen.getByRole('button', { name: /add.*item/i });
            await user.click(addItemButton);

            await waitFor(() => {
                expect(screen.getByText('Add New Item')).toBeInTheDocument();
            });

            // Fill out the form
            const nameField = screen.getByLabelText(/name/i);
            const skuField = screen.getByLabelText(/sku/i);
            const categoryField = screen.getByLabelText(/category/i);
            const stockField = screen.getByLabelText(/stock level/i);
            const priceField = screen.getByLabelText(/price/i);
            const locationField = screen.getByLabelText(/location/i);

            await user.type(nameField, 'New Product C');
            await user.type(skuField, 'NEW-001');
            await user.selectOptions(categoryField, 'Electronics');
            await user.type(stockField, '75');
            await user.type(priceField, '45.99');
            await user.selectOptions(locationField, 'Warehouse A');

            const saveButton = screen.getByRole('button', { name: /save/i });
            await user.click(saveButton);

            // Verify item creation
            await waitFor(() => {
                expect(mockApiService.createInventoryItem).toHaveBeenCalledWith({
                    name: 'New Product C',
                    sku: 'NEW-001',
                    category: 'Electronics',
                    stockLevel: 75,
                    unitPrice: 45.99,
                    location: 'Warehouse A',
                    minStock: 0,
                    description: '',
                });
            });

            // === PHASE 5: UPDATE STOCK LEVELS ===
            mockApiService.updateStock.mockResolvedValueOnce({
                success: true,
                data: {
                    ...mockInventoryItems[0],
                    stockLevel: 125, // 100 + 25
                },
            });

            // Find and click stock update button for Widget A
            const widgetCard = screen.getByText('Widget A').closest('[data-testid="inventory-item"]');
            const stockButton = within(widgetCard!).getByRole('button', { name: /update stock/i });
            await user.click(stockButton);

            await waitFor(() => {
                expect(screen.getByText('Update Stock')).toBeInTheDocument();
            });

            const quantityField = screen.getByLabelText(/quantity/i);
            const typeField = screen.getByLabelText(/action type/i);
            const notesField = screen.getByLabelText(/notes/i);

            await user.type(quantityField, '25');
            await user.selectOptions(typeField, 'ADD_STOCK');
            await user.type(notesField, 'Restocking from supplier');

            const updateStockButton = screen.getByRole('button', { name: /update/i });
            await user.click(updateStockButton);

            // Verify stock update
            await waitFor(() => {
                expect(mockApiService.updateStock).toHaveBeenCalledWith('1', {
                    quantity: 25,
                    type: 'ADD_STOCK',
                    notes: 'Restocking from supplier',
                });
            });

            // === PHASE 6: SEARCH AND FILTER ===
            const searchField = screen.getByPlaceholderText(/search/i);
            await user.type(searchField, 'Widget');

            await waitFor(() => {
                expect(mockApiService.getInventoryItems).toHaveBeenCalledWith(
                    expect.objectContaining({
                        search: 'Widget',
                    })
                );
            });

            // Test category filter
            const categoryFilter = screen.getByLabelText(/category/i);
            await user.selectOptions(categoryFilter, 'Electronics');

            await waitFor(() => {
                expect(mockApiService.getInventoryItems).toHaveBeenCalledWith(
                    expect.objectContaining({
                        category: 'Electronics',
                    })
                );
            });

            // === PHASE 7: VIEW LOW STOCK ALERTS ===
            const alertsButton = screen.getByRole('button', { name: /alerts/i });
            await user.click(alertsButton);

            await waitFor(() => {
                expect(mockApiService.getLowStockItems).toHaveBeenCalled();
            });

            // Verify low stock items are displayed
            expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
            expect(screen.getByText('Book B')).toBeInTheDocument();

            // === PHASE 8: LOGOUT ===
            mockApiService.logout.mockResolvedValueOnce({
                success: true,
            });

            const logoutButton = screen.getByRole('button', { name: /logout/i });
            await user.click(logoutButton);

            await waitFor(() => {
                expect(mockApiService.logout).toHaveBeenCalled();
            });

            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });

    describe('Complete Business Workflow - Admin User Journey', () => {
        it('should handle complete admin journey with user management', async () => {
            const user = userEvent.setup();

            // Setup API responses for admin workflow
            mockApiService.login.mockResolvedValueOnce({
                success: true,
                data: {
                    user: mockAdminUser,
                    token: 'admin-jwt-token',
                },
            });

            mockApiService.getAdminDashboard.mockResolvedValue({
                success: true,
                data: {
                    userStats: {
                        totalUsers: 2,
                        activeUsers: 2,
                        adminUsers: 1,
                        inactiveUsers: 0,
                    },
                    systemStats: {
                        totalItems: 2,
                        totalValue: 3079.95,
                        systemHealth: 'good',
                        lastBackup: '2023-01-01T00:00:00.000Z',
                    },
                    recentActivity: [],
                },
            });

            mockApiService.getUsers.mockResolvedValue({
                success: true,
                data: [mockAdminUser, mockRegularUser],
            });

            renderApp();

            // === PHASE 1: ADMIN LOGIN ===
            const emailField = screen.getByLabelText('Email Address');
            const passwordField = screen.getByLabelText('Password');
            const loginButton = screen.getByRole('button', { name: 'Sign In' });

            await user.type(emailField, 'admin@example.com');
            await user.type(passwordField, 'password123');
            await user.click(loginButton);

            await waitFor(() => {
                expect(mockApiService.login).toHaveBeenCalledWith({
                    email: 'admin@example.com',
                    password: 'password123',
                });
            });

            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');

            // === PHASE 2: ACCESS ADMIN PANEL ===
            const adminLink = screen.getByRole('link', { name: /admin/i });
            await user.click(adminLink);

            expect(mockNavigate).toHaveBeenCalledWith('/admin');

            // Simulate navigation to admin page
            window.history.pushState({}, 'Admin', '/admin');

            await waitFor(() => {
                expect(mockApiService.getAdminDashboard).toHaveBeenCalled();
                expect(mockApiService.getUsers).toHaveBeenCalled();
            });

            // Verify admin dashboard loads
            await waitFor(() => {
                expect(screen.getByText('Admin Panel')).toBeInTheDocument();
                expect(screen.getByText('User Management')).toBeInTheDocument();
                expect(screen.getByText('Total Users')).toBeInTheDocument();
                expect(screen.getByText('2')).toBeInTheDocument();
            });

            // === PHASE 3: CREATE NEW USER ===
            const newUser: User = {
                id: '3',
                name: 'New Employee',
                email: 'employee@example.com',
                role: UserRole.USER,
                isActive: true,
                createdAt: '2023-01-01T00:00:00.000Z',
                updatedAt: '2023-01-01T00:00:00.000Z',
            };

            mockApiService.createUser.mockResolvedValueOnce({
                success: true,
                data: newUser,
            });

            mockApiService.getUsers.mockResolvedValueOnce({
                success: true,
                data: [mockAdminUser, mockRegularUser, newUser],
            });

            const addUserButton = screen.getByRole('button', { name: /add.*user/i });
            await user.click(addUserButton);

            await waitFor(() => {
                expect(screen.getByText('Create New User')).toBeInTheDocument();
            });

            const userNameField = screen.getByLabelText(/name/i);
            const userEmailField = screen.getByLabelText(/email/i);
            const userPasswordField = screen.getByLabelText(/password/i);
            const userRoleField = screen.getByLabelText(/role/i);

            await user.type(userNameField, 'New Employee');
            await user.type(userEmailField, 'employee@example.com');
            await user.type(userPasswordField, 'password123');
            await user.selectOptions(userRoleField, UserRole.USER);

            const createUserButton = screen.getByRole('button', { name: /create/i });
            await user.click(createUserButton);

            // Verify user creation
            await waitFor(() => {
                expect(mockApiService.createUser).toHaveBeenCalledWith({
                    name: 'New Employee',
                    email: 'employee@example.com',
                    password: 'password123',
                    role: UserRole.USER,
                });
            });

            // === PHASE 4: MANAGE INVENTORY AS ADMIN ===
            const inventoryLink = screen.getByRole('link', { name: /inventory/i });
            await user.click(inventoryLink);

            expect(mockNavigate).toHaveBeenCalledWith('/inventory');

            // Simulate navigation to inventory
            window.history.pushState({}, 'Inventory', '/inventory');

            mockApiService.getInventoryItems.mockResolvedValue({
                data: mockInventoryItems,
                pagination: {
                    page: 1,
                    limit: 50,
                    total: 2,
                    totalPages: 1,
                },
            });

            await waitFor(() => {
                expect(mockApiService.getInventoryItems).toHaveBeenCalled();
            });

            // === PHASE 5: BULK OPERATIONS ===
            mockApiService.bulkUpdateItems.mockResolvedValueOnce({
                success: true,
                data: mockInventoryItems.map(item => ({
                    ...item,
                    category: 'Updated Category',
                })),
            });

            const bulkActionsButton = screen.getByRole('button', { name: /bulk.*actions/i });
            await user.click(bulkActionsButton);

            const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
            await user.click(selectAllCheckbox);

            const bulkUpdateButton = screen.getByRole('button', { name: /bulk.*update/i });
            await user.click(bulkUpdateButton);

            // Fill bulk update form
            const bulkCategoryField = screen.getByLabelText(/category/i);
            await user.selectOptions(bulkCategoryField, 'Updated Category');

            const applyBulkButton = screen.getByRole('button', { name: /apply/i });
            await user.click(applyBulkButton);

            // Verify bulk update
            await waitFor(() => {
                expect(mockApiService.bulkUpdateItems).toHaveBeenCalledWith([
                    { id: '1', category: 'Updated Category' },
                    { id: '2', category: 'Updated Category' },
                ]);
            });

            // === PHASE 6: GENERATE REPORTS ===
            mockApiService.getInventoryReport.mockResolvedValueOnce({
                success: true,
                data: {
                    items: mockInventoryItems,
                    summary: {
                        totalItems: 2,
                        totalValue: 3079.95,
                        categories: ['Electronics', 'Books'],
                        locations: ['Warehouse A', 'Warehouse B'],
                    },
                },
            });

            const reportsButton = screen.getByRole('button', { name: /reports/i });
            await user.click(reportsButton);

            const generateReportButton = screen.getByRole('button', { name: /generate.*report/i });
            await user.click(generateReportButton);

            await waitFor(() => {
                expect(mockApiService.getInventoryReport).toHaveBeenCalled();
            });

            // === PHASE 7: EXPORT DATA ===
            mockApiService.exportInventoryReport.mockResolvedValueOnce(
                new Blob(['csv,data'], { type: 'text/csv' })
            );

            const exportButton = screen.getByRole('button', { name: /export.*csv/i });
            await user.click(exportButton);

            await waitFor(() => {
                expect(mockApiService.exportInventoryReport).toHaveBeenCalledWith('csv', {});
            });
        });
    });

    describe('Error Recovery and Edge Cases', () => {
        it('should handle complete error recovery workflow', async () => {
            const user = userEvent.setup();

            // === PHASE 1: LOGIN FAILURE AND RETRY ===
            mockApiService.login
                .mockRejectedValueOnce(new Error('Network connection failed'))
                .mockResolvedValueOnce({
                    success: true,
                    data: {
                        user: mockRegularUser,
                        token: 'user-jwt-token',
                    },
                });

            renderApp();

            const emailField = screen.getByLabelText('Email Address');
            const passwordField = screen.getByLabelText('Password');
            const loginButton = screen.getByRole('button', { name: 'Sign In' });

            await user.type(emailField, 'user@example.com');
            await user.type(passwordField, 'password123');
            await user.click(loginButton);

            // Verify error message appears
            await waitFor(() => {
                expect(screen.getByText('Network connection failed')).toBeInTheDocument();
            });

            // Retry login
            await user.click(loginButton);

            // Verify successful login on retry
            await waitFor(() => {
                expect(mockApiService.login).toHaveBeenCalledTimes(2);
            });

            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');

            // === PHASE 2: API FAILURE AND RECOVERY ===
            mockApiService.getDashboardMetrics
                .mockRejectedValueOnce(new Error('Server error'))
                .mockResolvedValueOnce({
                    data: mockDashboardMetrics,
                });

            window.history.pushState({}, 'Dashboard', '/dashboard');

            // Verify error state
            await waitFor(() => {
                expect(screen.getByText('Error Loading Dashboard')).toBeInTheDocument();
            });

            // Retry loading
            const retryButton = screen.getByRole('button', { name: /retry/i });
            await user.click(retryButton);

            // Verify successful load on retry
            await waitFor(() => {
                expect(screen.getByText('Dashboard')).toBeInTheDocument();
                expect(screen.getByText('Total Items')).toBeInTheDocument();
            });

            // === PHASE 3: FORM VALIDATION AND CORRECTION ===
            mockApiService.getInventoryItems.mockResolvedValue({
                data: mockInventoryItems,
                pagination: {
                    page: 1,
                    limit: 50,
                    total: 2,
                    totalPages: 1,
                },
            });

            const inventoryLink = screen.getByRole('link', { name: /inventory/i });
            await user.click(inventoryLink);

            window.history.pushState({}, 'Inventory', '/inventory');

            await waitFor(() => {
                expect(screen.getByText('Inventory Management')).toBeInTheDocument();
            });

            // Try to create item with invalid data
            const addItemButton = screen.getByRole('button', { name: /add.*item/i });
            await user.click(addItemButton);

            await waitFor(() => {
                expect(screen.getByText('Add New Item')).toBeInTheDocument();
            });

            // Submit empty form to trigger validation
            const saveButton = screen.getByRole('button', { name: /save/i });
            await user.click(saveButton);

            // Verify validation errors
            await waitFor(() => {
                expect(screen.getByText('Name is required')).toBeInTheDocument();
                expect(screen.getByText('SKU is required')).toBeInTheDocument();
            });

            // Correct the form
            const nameField = screen.getByLabelText(/name/i);
            const skuField = screen.getByLabelText(/sku/i);

            await user.type(nameField, 'Valid Product');
            await user.type(skuField, 'VALID-001');

            // Verify validation errors clear
            await waitFor(() => {
                expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
                expect(screen.queryByText('SKU is required')).not.toBeInTheDocument();
            });

            // === PHASE 4: NETWORK RECOVERY ===
            mockApiService.createInventoryItem
                .mockRejectedValueOnce(new Error('Network timeout'))
                .mockResolvedValueOnce({
                    success: true,
                    data: {
                        id: '3',
                        name: 'Valid Product',
                        sku: 'VALID-001',
                        category: 'Electronics',
                        stockLevel: 0,
                        minStock: 0,
                        unitPrice: 0,
                        location: 'Warehouse A',
                        description: '',
                        createdAt: '2023-01-01T00:00:00.000Z',
                        updatedAt: '2023-01-01T00:00:00.000Z',
                    },
                });

            await user.click(saveButton);

            // Verify network error
            await waitFor(() => {
                expect(screen.getByText('Network timeout')).toBeInTheDocument();
            });

            // Retry submission
            await user.click(saveButton);

            // Verify successful creation on retry
            await waitFor(() => {
                expect(mockApiService.createInventoryItem).toHaveBeenCalledTimes(2);
            });
        });

        it('should handle session expiration and re-authentication', async () => {
            const user = userEvent.setup();

            // Setup initial successful login
            mockApiService.login.mockResolvedValueOnce({
                success: true,
                data: {
                    user: mockRegularUser,
                    token: 'user-jwt-token',
                },
            });

            renderApp();

            // Login
            const emailField = screen.getByLabelText('Email Address');
            const passwordField = screen.getByLabelText('Password');
            const loginButton = screen.getByRole('button', { name: 'Sign In' });

            await user.type(emailField, 'user@example.com');
            await user.type(passwordField, 'password123');
            await user.click(loginButton);

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
            });

            // Simulate session expiration
            mockApiService.getDashboardMetrics.mockRejectedValueOnce(
                new Error('Authentication required')
            );

            window.history.pushState({}, 'Dashboard', '/dashboard');

            // Verify redirect to login on auth error
            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/login');
            });

            // Verify user can re-authenticate
            mockApiService.login.mockResolvedValueOnce({
                success: true,
                data: {
                    user: mockRegularUser,
                    token: 'new-jwt-token',
                },
            });

            await user.type(emailField, 'user@example.com');
            await user.type(passwordField, 'password123');
            await user.click(loginButton);

            await waitFor(() => {
                expect(mockApiService.setToken).toHaveBeenCalledWith('new-jwt-token');
            });
        });
    });
});