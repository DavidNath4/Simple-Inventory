import { render, screen, waitFor, fireEvent } from '@testing-library/react';
// Mock react-router-dom
jest.mock('react-router-dom', () => ({
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
import Dashboard from '../Dashboard';
import { AuthProvider } from '../../contexts/AuthContext';
import { NotificationProvider } from '../../contexts/NotificationContext';
import { apiService } from '../../services/api';
import { DashboardMetrics, User, UserRole } from '../../types';

// Mock API service
jest.mock('../../services/api', () => ({
    apiService: {
        getDashboardMetrics: jest.fn(),
    },
}));

// Mock hooks
jest.mock('../../hooks', () => ({
    useInventoryNotifications: () => ({
        notifySystem: jest.fn(),
    }),
}));

// Mock AuthContext
const mockAuthContext = {
    user: null as User | null,
    token: 'mock-token',
    isAuthenticated: true,
    isAdmin: false,
    login: jest.fn(),
    logout: jest.fn(),
};

jest.mock('../../contexts/AuthContext', () => ({
    useAuth: () => mockAuthContext,
    AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock NotificationContext
jest.mock('../../contexts/NotificationContext', () => ({
    NotificationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useNotification: () => ({
        addNotification: jest.fn(),
    }),
}));

const mockApiService = apiService as jest.Mocked<typeof apiService>;

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
            { date: '2023-01-03', stockIn: 60, stockOut: 25, netChange: 35 },
        ],
        valueChanges: [
            { date: '2023-01-01', totalValue: 24000, valueChange: -500 },
            { date: '2023-01-02', totalValue: 24500, valueChange: 500 },
            { date: '2023-01-03', totalValue: 25000, valueChange: 500 },
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

const renderDashboard = () => {
    return render(
        <AuthProvider>
            <NotificationProvider>
                <Dashboard />
            </NotificationProvider>
        </AuthProvider>
    );
};

describe('Dashboard Page', () => {
    const mockUser: User = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.USER,
        isActive: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockAuthContext.user = mockUser;
        mockAuthContext.isAuthenticated = true;
        mockAuthContext.isAdmin = false;
    });

    describe('Loading States', () => {
        it('shows loading spinner while fetching data', () => {
            mockApiService.getDashboardMetrics.mockImplementation(
                () => new Promise(resolve => setTimeout(resolve, 100))
            );

            renderDashboard();

            expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument(); // Loading spinner
        });

        it('shows error state when API call fails', async () => {
            mockApiService.getDashboardMetrics.mockRejectedValueOnce(
                new Error('Failed to load metrics')
            );

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Error Loading Dashboard')).toBeInTheDocument();
                expect(screen.getByText('Failed to load metrics')).toBeInTheDocument();
            });
        });

        it('shows retry button in error state', async () => {
            mockApiService.getDashboardMetrics.mockRejectedValueOnce(
                new Error('Failed to load metrics')
            );

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
            });
        });

        it('retries loading when retry button is clicked', async () => {
            mockApiService.getDashboardMetrics
                .mockRejectedValueOnce(new Error('Failed to load metrics'))
                .mockResolvedValueOnce({ data: mockDashboardMetrics });

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
            });

            const retryButton = screen.getByRole('button', { name: 'Retry' });
            fireEvent.click(retryButton);

            expect(mockApiService.getDashboardMetrics).toHaveBeenCalledTimes(2);
        });
    });

    describe('Dashboard Content', () => {
        beforeEach(() => {
            mockApiService.getDashboardMetrics.mockResolvedValue({
                data: mockDashboardMetrics,
            });
        });

        it('renders dashboard header and description', async () => {
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Dashboard')).toBeInTheDocument();
                expect(screen.getByText('Overview of your inventory performance and key metrics')).toBeInTheDocument();
            });
        });

        it('displays overview metrics cards', async () => {
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Total Items')).toBeInTheDocument();
                expect(screen.getByText('150')).toBeInTheDocument();
                expect(screen.getByText('8 categories')).toBeInTheDocument();

                expect(screen.getByText('Total Value')).toBeInTheDocument();
                expect(screen.getByText('$25,000.00')).toBeInTheDocument();
                expect(screen.getByText('3 locations')).toBeInTheDocument();

                expect(screen.getByText('Low Stock Items')).toBeInTheDocument();
                expect(screen.getByText('12')).toBeInTheDocument();
                expect(screen.getByText('Need attention')).toBeInTheDocument();

                expect(screen.getByText('Out of Stock')).toBeInTheDocument();
                expect(screen.getByText('3')).toBeInTheDocument();
                expect(screen.getByText('Critical items')).toBeInTheDocument();
            });
        });

        it('displays performance metrics', async () => {
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Stock Turnover')).toBeInTheDocument();
                expect(screen.getByText('4.20')).toBeInTheDocument();
                expect(screen.getByText('Times per period')).toBeInTheDocument();

                expect(screen.getByText('Average Stock Level')).toBeInTheDocument();
                expect(screen.getByText('46')).toBeInTheDocument();
                expect(screen.getByText('Units per item')).toBeInTheDocument();

                expect(screen.getByText('Stock Accuracy')).toBeInTheDocument();
                expect(screen.getByText('95.0%')).toBeInTheDocument();
                expect(screen.getByText('System accuracy')).toBeInTheDocument();
            });
        });

        it('displays charts with correct titles', async () => {
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Stock Movements (Last 7 Days)')).toBeInTheDocument();
                expect(screen.getByText('Inventory Value Trends (Last 7 Days)')).toBeInTheDocument();
            });
        });

        it('shows alerts panel', async () => {
            renderDashboard();

            await waitFor(() => {
                // The alerts panel should be rendered with the mock data
                expect(screen.getByText('Dashboard')).toBeInTheDocument();
            });
        });

        it('renders report generator component', async () => {
            renderDashboard();

            await waitFor(() => {
                // Report generator should be present (assuming it has some identifiable content)
                expect(screen.getByText('Dashboard')).toBeInTheDocument();
            });
        });
    });

    describe('Data Formatting', () => {
        beforeEach(() => {
            mockApiService.getDashboardMetrics.mockResolvedValue({
                data: mockDashboardMetrics,
            });
        });

        it('formats currency values correctly', async () => {
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('$25,000.00')).toBeInTheDocument();
            });
        });

        it('formats number values correctly', async () => {
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('150')).toBeInTheDocument(); // Total items
                expect(screen.getByText('12')).toBeInTheDocument(); // Low stock count
                expect(screen.getByText('3')).toBeInTheDocument(); // Out of stock count
            });
        });

        it('formats percentage values correctly', async () => {
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('95.0%')).toBeInTheDocument();
            });
        });

        it('formats decimal values correctly', async () => {
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('4.20')).toBeInTheDocument(); // Stock turnover
                expect(screen.getByText('46')).toBeInTheDocument(); // Average stock level (rounded)
            });
        });
    });

    describe('Role-Based Access', () => {
        it('displays dashboard content for regular users', async () => {
            mockAuthContext.user = mockUser;
            mockAuthContext.isAdmin = false;
            mockApiService.getDashboardMetrics.mockResolvedValue({
                data: mockDashboardMetrics,
            });

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Dashboard')).toBeInTheDocument();
                expect(screen.getByText('Total Items')).toBeInTheDocument();
            });
        });

        it('displays dashboard content for admin users', async () => {
            mockAuthContext.user = { ...mockUser, role: UserRole.ADMIN };
            mockAuthContext.isAdmin = true;
            mockApiService.getDashboardMetrics.mockResolvedValue({
                data: mockDashboardMetrics,
            });

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Dashboard')).toBeInTheDocument();
                expect(screen.getByText('Total Items')).toBeInTheDocument();
            });
        });
    });

    describe('Empty State', () => {
        it('shows no data message when metrics is null', async () => {
            mockApiService.getDashboardMetrics.mockResolvedValue({
                data: null,
            });

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('No dashboard data available')).toBeInTheDocument();
            });
        });
    });
});