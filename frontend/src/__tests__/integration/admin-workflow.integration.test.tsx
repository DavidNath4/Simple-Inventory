import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import App from '../../App';
import { apiService } from '../../services/api';
import { User, UserRole } from '../../types';

// Mock API service
jest.mock('../../services/api', () => ({
    apiService: {
        login: jest.fn(),
        logout: jest.fn(),
        setToken: jest.fn(),
        getUsers: jest.fn(),
        createUser: jest.fn(),
        updateUser: jest.fn(),
        deleteUser: jest.fn(),
        activateUser: jest.fn(),
        deactivateUser: jest.fn(),
        getAdminDashboard: jest.fn(),
    },
}));

const mockApiService = apiService as jest.Mocked<typeof apiService>;

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

describe('Complete Admin Workflow Integration Tests', () => {
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

    const mockAdminDashboard = {
        userStats: {
            totalUsers: 10,
            activeUsers: 8,
            adminUsers: 2,
            inactiveUsers: 2,
        },
        systemStats: {
            totalItems: 150,
            totalValue: 25000,
            systemHealth: 'good',
            lastBackup: '2023-01-01T00:00:00.000Z',
        },
        recentActivity: [
            {
                id: '1',
                action: 'USER_CREATED',
                user: 'admin@example.com',
                timestamp: '2023-01-01T00:00:00.000Z',
                details: 'Created user: user@example.com',
            },
        ],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        mockNavigate.mockClear();
    });

    describe('Complete Admin Login and Dashboard Access', () => {
        it('should handle admin login and dashboard access workflow', async () => {
            const user = userEvent.setup();

            // Mock successful admin login
            mockApiService.login.mockResolvedValueOnce({
                success: true,
                data: {
                    user: mockAdminUser,
                    token: 'admin-jwt-token',
                },
            });

            // Mock admin dashboard data
            mockApiService.getAdminDashboard.mockResolvedValue({
                success: true,
                data: mockAdminDashboard,
            });

            renderApp();

            // Step 1: Admin logs in
            const emailField = screen.getByLabelText('Email Address');
            const passwordField = screen.getByLabelText('Password');
            const loginButton = screen.getByRole('button', { name: 'Sign In' });

            await user.type(emailField, 'admin@example.com');
            await user.type(passwordField, 'password123');
            await user.click(loginButton);

            // Step 2: Verify admin login and redirect
            await waitFor(() => {
                expect(mockApiService.login).toHaveBeenCalledWith({
                    email: 'admin@example.com',
                    password: 'password123',
                });
            });

            expect(mockApiService.setToken).toHaveBeenCalledWith('admin-jwt-token');
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');

            // Step 3: Navigate to admin panel
            window.history.pushState({}, 'Admin', '/admin');

            await waitFor(() => {
                expect(mockApiService.getAdminDashboard).toHaveBeenCalled();
            });
        });

        it('should prevent regular user from accessing admin features', async () => {
            const user = userEvent.setup();

            // Mock regular user login
            mockApiService.login.mockResolvedValueOnce({
                success: true,
                data: {
                    user: mockRegularUser,
                    token: 'user-jwt-token',
                },
            });

            renderApp();

            // Login as regular user
            const emailField = screen.getByLabelText('Email Address');
            const passwordField = screen.getByLabelText('Password');
            const loginButton = screen.getByRole('button', { name: 'Sign In' });

            await user.type(emailField, 'user@example.com');
            await user.type(passwordField, 'password123');
            await user.click(loginButton);

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
            });

            // Try to access admin panel - should be redirected or show error
            window.history.pushState({}, 'Admin', '/admin');

            // Regular user should not see admin navigation or be redirected
            expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
        });
    });

    describe('Complete User Management Workflow', () => {
        beforeEach(() => {
            // Mock authenticated admin state
            localStorage.setItem('auth_token', 'admin-jwt-token');
            
            // Mock users list
            mockApiService.getUsers.mockResolvedValue({
                success: true,
                data: [mockAdminUser, mockRegularUser],
            });
        });

        it('should handle complete user creation workflow', async () => {
            const user = userEvent.setup();

            // Mock successful user creation
            const newUser: User = {
                id: '3',
                name: 'New Test User',
                email: 'newuser@example.com',
                role: UserRole.USER,
                isActive: true,
                createdAt: '2023-01-01T00:00:00.000Z',
                updatedAt: '2023-01-01T00:00:00.000Z',
            };

            mockApiService.createUser.mockResolvedValueOnce({
                success: true,
                data: newUser,
            });

            // Mock updated users list
            mockApiService.getUsers.mockResolvedValueOnce({
                success: true,
                data: [mockAdminUser, mockRegularUser, newUser],
            });

            renderApp();

            // Navigate to admin panel
            window.history.pushState({}, 'Admin', '/admin');

            await waitFor(() => {
                expect(screen.getByText('User Management')).toBeInTheDocument();
            });

            // Step 1: Click "Add User" button
            const addUserButton = screen.getByRole('button', { name: /add.*user/i });
            await user.click(addUserButton);

            // Step 2: Fill out user creation form
            await waitFor(() => {
                expect(screen.getByText('Create New User')).toBeInTheDocument();
            });

            const nameField = screen.getByLabelText(/name/i);
            const emailField = screen.getByLabelText(/email/i);
            const passwordField = screen.getByLabelText(/password/i);
            const roleField = screen.getByLabelText(/role/i);

            await user.type(nameField, 'New Test User');
            await user.type(emailField, 'newuser@example.com');
            await user.type(passwordField, 'password123');
            await user.selectOptions(roleField, UserRole.USER);

            // Step 3: Submit the form
            const createButton = screen.getByRole('button', { name: /create/i });
            await user.click(createButton);

            // Step 4: Verify API call and success
            await waitFor(() => {
                expect(mockApiService.createUser).toHaveBeenCalledWith({
                    name: 'New Test User',
                    email: 'newuser@example.com',
                    password: 'password123',
                    role: UserRole.USER,
                });
            });

            // Step 5: Verify users list is refreshed
            expect(mockApiService.getUsers).toHaveBeenCalledTimes(2);
        });

        it('should handle user update workflow', async () => {
            const user = userEvent.setup();

            // Mock successful user update
            const updatedUser = {
                ...mockRegularUser,
                name: 'Updated User Name',
            };

            mockApiService.updateUser.mockResolvedValueOnce({
                success: true,
                data: updatedUser,
            });

            renderApp();

            // Navigate to admin panel
            window.history.pushState({}, 'Admin', '/admin');

            await waitFor(() => {
                expect(screen.getByText('User Management')).toBeInTheDocument();
            });

            // Step 1: Find and click edit button for regular user
            const userCard = screen.getByText('Regular User').closest('[data-testid="user-card"]');
            expect(userCard).toBeInTheDocument();

            const editButton = within(userCard!).getByRole('button', { name: /edit/i });
            await user.click(editButton);

            // Step 2: Update user information
            await waitFor(() => {
                expect(screen.getByText('Edit User')).toBeInTheDocument();
            });

            const nameField = screen.getByDisplayValue('Regular User');
            await user.clear(nameField);
            await user.type(nameField, 'Updated User Name');

            // Step 3: Submit the update
            const updateButton = screen.getByRole('button', { name: /update/i });
            await user.click(updateButton);

            // Step 4: Verify API call
            await waitFor(() => {
                expect(mockApiService.updateUser).toHaveBeenCalledWith('2', {
                    name: 'Updated User Name',
                });
            });
        });

        it('should handle user activation/deactivation workflow', async () => {
            const user = userEvent.setup();

            // Mock successful deactivation
            const deactivatedUser = {
                ...mockRegularUser,
                isActive: false,
            };

            mockApiService.deactivateUser.mockResolvedValueOnce({
                success: true,
                data: deactivatedUser,
            });

            // Mock successful reactivation
            const reactivatedUser = {
                ...mockRegularUser,
                isActive: true,
            };

            mockApiService.activateUser.mockResolvedValueOnce({
                success: true,
                data: reactivatedUser,
            });

            renderApp();

            // Navigate to admin panel
            window.history.pushState({}, 'Admin', '/admin');

            await waitFor(() => {
                expect(screen.getByText('User Management')).toBeInTheDocument();
            });

            // Step 1: Deactivate user
            const userCard = screen.getByText('Regular User').closest('[data-testid="user-card"]');
            const deactivateButton = within(userCard!).getByRole('button', { name: /deactivate/i });
            await user.click(deactivateButton);

            // Confirm deactivation
            const confirmButton = screen.getByRole('button', { name: /confirm/i });
            await user.click(confirmButton);

            // Verify deactivation API call
            await waitFor(() => {
                expect(mockApiService.deactivateUser).toHaveBeenCalledWith('2');
            });

            // Step 2: Reactivate user
            const activateButton = within(userCard!).getByRole('button', { name: /activate/i });
            await user.click(activateButton);

            // Verify activation API call
            await waitFor(() => {
                expect(mockApiService.activateUser).toHaveBeenCalledWith('2');
            });
        });

        it('should handle user deletion workflow', async () => {
            const user = userEvent.setup();

            // Mock successful deletion
            mockApiService.deleteUser.mockResolvedValueOnce({
                success: true,
            });

            // Mock updated users list without deleted user
            mockApiService.getUsers.mockResolvedValueOnce({
                success: true,
                data: [mockAdminUser],
            });

            renderApp();

            // Navigate to admin panel
            window.history.pushState({}, 'Admin', '/admin');

            await waitFor(() => {
                expect(screen.getByText('User Management')).toBeInTheDocument();
            });

            // Step 1: Click delete button
            const userCard = screen.getByText('Regular User').closest('[data-testid="user-card"]');
            const deleteButton = within(userCard!).getByRole('button', { name: /delete/i });
            await user.click(deleteButton);

            // Step 2: Confirm deletion
            await waitFor(() => {
                expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
            });

            const confirmDeleteButton = screen.getByRole('button', { name: /delete/i });
            await user.click(confirmDeleteButton);

            // Step 3: Verify API call and list refresh
            await waitFor(() => {
                expect(mockApiService.deleteUser).toHaveBeenCalledWith('2');
            });

            expect(mockApiService.getUsers).toHaveBeenCalledTimes(2);
        });

        it('should handle user management error scenarios', async () => {
            const user = userEvent.setup();

            // Mock API error for duplicate email
            mockApiService.createUser.mockRejectedValueOnce(
                new Error('Email already exists')
            );

            renderApp();

            // Navigate to admin panel
            window.history.pushState({}, 'Admin', '/admin');

            await waitFor(() => {
                expect(screen.getByText('User Management')).toBeInTheDocument();
            });

            // Try to create user with duplicate email
            const addUserButton = screen.getByRole('button', { name: /add.*user/i });
            await user.click(addUserButton);

            await waitFor(() => {
                expect(screen.getByText('Create New User')).toBeInTheDocument();
            });

            // Fill form with duplicate email
            const nameField = screen.getByLabelText(/name/i);
            const emailField = screen.getByLabelText(/email/i);
            const passwordField = screen.getByLabelText(/password/i);

            await user.type(nameField, 'Duplicate User');
            await user.type(emailField, 'user@example.com'); // Same as existing user
            await user.type(passwordField, 'password123');

            const createButton = screen.getByRole('button', { name: /create/i });
            await user.click(createButton);

            // Verify error message is displayed
            await waitFor(() => {
                expect(screen.getByText('Email already exists')).toBeInTheDocument();
            });
        });
    });

    describe('Admin Dashboard and System Management', () => {
        beforeEach(() => {
            localStorage.setItem('auth_token', 'admin-jwt-token');
            mockApiService.getAdminDashboard.mockResolvedValue({
                success: true,
                data: mockAdminDashboard,
            });
        });

        it('should handle admin dashboard data display', async () => {
            renderApp();

            // Navigate to admin panel
            window.history.pushState({}, 'Admin', '/admin');

            await waitFor(() => {
                expect(mockApiService.getAdminDashboard).toHaveBeenCalled();
            });

            // Verify dashboard statistics are displayed
            await waitFor(() => {
                expect(screen.getByText('Total Users')).toBeInTheDocument();
                expect(screen.getByText('10')).toBeInTheDocument(); // totalUsers
                expect(screen.getByText('Active Users')).toBeInTheDocument();
                expect(screen.getByText('8')).toBeInTheDocument(); // activeUsers
                expect(screen.getByText('Admin Users')).toBeInTheDocument();
                expect(screen.getByText('2')).toBeInTheDocument(); // adminUsers
            });

            // Verify system statistics
            expect(screen.getByText('Total Items')).toBeInTheDocument();
            expect(screen.getByText('150')).toBeInTheDocument(); // totalItems
            expect(screen.getByText('Total Value')).toBeInTheDocument();
            expect(screen.getByText('$25,000')).toBeInTheDocument(); // totalValue

            // Verify recent activity
            expect(screen.getByText('Recent Activity')).toBeInTheDocument();
            expect(screen.getByText('Created user: user@example.com')).toBeInTheDocument();
        });

        it('should handle system configuration updates', async () => {
            const user = userEvent.setup();

            // Mock system config update
            mockApiService.updateUser.mockResolvedValueOnce({
                success: true,
                data: { message: 'System configuration updated' },
            });

            renderApp();

            // Navigate to admin panel
            window.history.pushState({}, 'Admin', '/admin');

            await waitFor(() => {
                expect(screen.getByText('System Configuration')).toBeInTheDocument();
            });

            // Update system settings
            const configButton = screen.getByRole('button', { name: /update.*config/i });
            await user.click(configButton);

            // Verify configuration modal or form appears
            await waitFor(() => {
                expect(screen.getByText('System Settings')).toBeInTheDocument();
            });

            // Make configuration changes
            const settingField = screen.getByLabelText(/backup.*frequency/i);
            await user.selectOptions(settingField, 'daily');

            const saveButton = screen.getByRole('button', { name: /save/i });
            await user.click(saveButton);

            // Verify success message
            await waitFor(() => {
                expect(screen.getByText('Configuration updated successfully')).toBeInTheDocument();
            });
        });
    });

    describe('Admin Error Handling and Edge Cases', () => {
        beforeEach(() => {
            localStorage.setItem('auth_token', 'admin-jwt-token');
        });

        it('should handle admin dashboard loading errors', async () => {
            // Mock dashboard API error
            mockApiService.getAdminDashboard.mockRejectedValueOnce(
                new Error('Failed to load admin dashboard')
            );

            renderApp();

            // Navigate to admin panel
            window.history.pushState({}, 'Admin', '/admin');

            // Verify error state is displayed
            await waitFor(() => {
                expect(screen.getByText('Error Loading Admin Dashboard')).toBeInTheDocument();
                expect(screen.getByText('Failed to load admin dashboard')).toBeInTheDocument();
            });

            // Verify retry functionality
            const retryButton = screen.getByRole('button', { name: /retry/i });
            expect(retryButton).toBeInTheDocument();

            // Mock successful retry
            mockApiService.getAdminDashboard.mockResolvedValueOnce({
                success: true,
                data: mockAdminDashboard,
            });

            fireEvent.click(retryButton);

            // Verify dashboard loads after retry
            await waitFor(() => {
                expect(screen.getByText('Total Users')).toBeInTheDocument();
            });
        });

        it('should handle network errors gracefully', async () => {
            const user = userEvent.setup();

            // Mock network error
            mockApiService.getUsers.mockRejectedValueOnce(
                new Error('Network connection failed')
            );

            renderApp();

            // Navigate to admin panel
            window.history.pushState({}, 'Admin', '/admin');

            // Verify network error message
            await waitFor(() => {
                expect(screen.getByText('Network Error')).toBeInTheDocument();
                expect(screen.getByText('Please check your connection and try again')).toBeInTheDocument();
            });
        });

        it('should handle unauthorized access attempts', async () => {
            // Mock unauthorized error
            mockApiService.getUsers.mockRejectedValueOnce(
                new Error('Access denied')
            );

            renderApp();

            // Navigate to admin panel
            window.history.pushState({}, 'Admin', '/admin');

            // Verify unauthorized error handling
            await waitFor(() => {
                expect(screen.getByText('Access Denied')).toBeInTheDocument();
            });

            // Should redirect to login
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });
});