import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
import Admin from '../Admin';
import { AuthProvider } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import { User, UserRole } from '../../types';

// Mock API service
jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
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

const mockApiService = apiService as jest.Mocked<typeof apiService>;

const mockAdminStats = {
  users: {
    total: 25,
    active: 20,
    inactive: 5,
  },
  inventory: {
    totalItems: 150,
  },
  activity: {
    recentActions: 45,
  },
};

const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: UserRole.USER,
    isActive: true,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    name: 'Jane Admin',
    email: 'jane@example.com',
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: '2023-01-02T00:00:00.000Z',
    updatedAt: '2023-01-02T00:00:00.000Z',
  },
  {
    id: '3',
    name: 'Bob Inactive',
    email: 'bob@example.com',
    role: UserRole.USER,
    isActive: false,
    createdAt: '2023-01-03T00:00:00.000Z',
    updatedAt: '2023-01-03T00:00:00.000Z',
  },
];

const renderAdmin = () => {
  return render(
    <AuthProvider>
      <Admin />
    </AuthProvider>
  );
};

describe('Admin Page', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthContext.user = mockAdminUser;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.isAdmin = true;

    // Default API responses
    mockApiService.get.mockImplementation((url) => {
      if (url.includes('/admin/dashboard')) {
        return Promise.resolve({ data: mockAdminStats });
      }
      if (url.includes('/admin/users')) {
        return Promise.resolve({ data: mockUsers });
      }
      return Promise.resolve({ data: [] });
    });
  });

  describe('Access Control', () => {
    it('renders admin panel for admin users', async () => {
      mockAuthContext.user = mockAdminUser;
      mockAuthContext.isAdmin = true;
      
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Admin Panel')).toBeInTheDocument();
        expect(screen.getByText('Manage users and system configuration')).toBeInTheDocument();
      });
    });

    it('shows access denied for non-admin users', () => {
      mockAuthContext.user = mockRegularUser;
      mockAuthContext.isAdmin = false;
      
      renderAdmin();
      
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('You need admin privileges to access this page.')).toBeInTheDocument();
    });

    it('displays access denied icon for non-admin users', () => {
      mockAuthContext.user = mockRegularUser;
      mockAuthContext.isAdmin = false;
      
      renderAdmin();
      
      const accessDeniedIcon = screen.getByRole('img', { hidden: true });
      expect(accessDeniedIcon).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(() => {
      mockAuthContext.isAdmin = true;
    });

    it('renders all tab buttons', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /user management/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /system configuration/i })).toBeInTheDocument();
      });
    });

    it('shows dashboard tab as active by default', async () => {
      renderAdmin();
      
      await waitFor(() => {
        const dashboardTab = screen.getByRole('button', { name: /dashboard/i });
        expect(dashboardTab).toHaveClass('bg-primary-100', 'text-primary-700');
      });
    });

    it('switches to users tab when clicked', async () => {
      renderAdmin();
      
      await waitFor(() => {
        const usersTab = screen.getByRole('button', { name: /user management/i });
        fireEvent.click(usersTab);
        
        expect(usersTab).toHaveClass('bg-primary-100', 'text-primary-700');
        expect(screen.getByText('User Management')).toBeInTheDocument();
      });
    });

    it('switches to system tab when clicked', async () => {
      renderAdmin();
      
      await waitFor(() => {
        const systemTab = screen.getByRole('button', { name: /system configuration/i });
        fireEvent.click(systemTab);
        
        expect(systemTab).toHaveClass('bg-primary-100', 'text-primary-700');
        expect(screen.getByText('System Configuration')).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard Tab', () => {
    beforeEach(() => {
      mockAuthContext.isAdmin = true;
    });

    it('displays system overview title', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('System Overview')).toBeInTheDocument();
      });
    });

    it('shows loading spinner while fetching stats', () => {
      mockApiService.get.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderAdmin();
      
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });

    it('displays admin stats cards with correct data', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('25')).toBeInTheDocument();
        
        expect(screen.getByText('Active Users')).toBeInTheDocument();
        expect(screen.getByText('20')).toBeInTheDocument();
        
        expect(screen.getByText('Inventory Items')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
        
        expect(screen.getByText('Recent Actions (24h)')).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
      });
    });

    it('shows no data message when stats are null', async () => {
      mockApiService.get.mockResolvedValueOnce({ data: null });
      
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('No data available')).toBeInTheDocument();
      });
    });
  });

  describe('Users Tab', () => {
    beforeEach(() => {
      mockAuthContext.isAdmin = true;
    });

    it('displays user management interface when users tab is clicked', async () => {
      renderAdmin();
      
      await waitFor(() => {
        const usersTab = screen.getByRole('button', { name: /user management/i });
        fireEvent.click(usersTab);
        
        expect(screen.getByText('User Management')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add User' })).toBeInTheDocument();
      });
    });

    it('displays users table with correct data', async () => {
      renderAdmin();
      
      await waitFor(() => {
        const usersTab = screen.getByRole('button', { name: /user management/i });
        fireEvent.click(usersTab);
      });
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('Jane Admin')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
        expect(screen.getByText('Bob Inactive')).toBeInTheDocument();
        expect(screen.getByText('bob@example.com')).toBeInTheDocument();
      });
    });

    it('displays correct role badges', async () => {
      renderAdmin();
      
      await waitFor(() => {
        const usersTab = screen.getByRole('button', { name: /user management/i });
        fireEvent.click(usersTab);
      });
      
      await waitFor(() => {
        const userBadges = screen.getAllByText('USER');
        const adminBadges = screen.getAllByText('ADMIN');
        
        expect(userBadges).toHaveLength(2); // John and Bob
        expect(adminBadges).toHaveLength(1); // Jane
        
        // Check styling
        expect(adminBadges[0]).toHaveClass('bg-error-100', 'text-error-800');
        expect(userBadges[0]).toHaveClass('bg-primary-100', 'text-primary-800');
      });
    });

    it('displays correct status badges', async () => {
      renderAdmin();
      
      await waitFor(() => {
        const usersTab = screen.getByRole('button', { name: /user management/i });
        fireEvent.click(usersTab);
      });
      
      await waitFor(() => {
        const activeBadges = screen.getAllByText('Active');
        const inactiveBadges = screen.getAllByText('Inactive');
        
        expect(activeBadges).toHaveLength(2); // John and Jane
        expect(inactiveBadges).toHaveLength(1); // Bob
        
        // Check styling
        expect(activeBadges[0]).toHaveClass('bg-success-100', 'text-success-800');
        expect(inactiveBadges[0]).toHaveClass('bg-gray-100', 'text-gray-800');
      });
    });

    it('shows user action buttons', async () => {
      renderAdmin();
      
      await waitFor(() => {
        const usersTab = screen.getByRole('button', { name: /user management/i });
        fireEvent.click(usersTab);
      });
      
      await waitFor(() => {
        const deactivateButtons = screen.getAllByText('Deactivate');
        const activateButtons = screen.getAllByText('Activate');
        const deleteButtons = screen.getAllByText('Delete');
        
        expect(deactivateButtons).toHaveLength(2); // Active users
        expect(activateButtons).toHaveLength(1); // Inactive user
        expect(deleteButtons).toHaveLength(3); // All users
      });
    });

    it('shows empty state when no users exist', async () => {
      mockApiService.get.mockImplementation((url) => {
        if (url.includes('/admin/users')) {
          return Promise.resolve({ data: [] });
        }
        return Promise.resolve({ data: mockAdminStats });
      });
      
      renderAdmin();
      
      await waitFor(() => {
        const usersTab = screen.getByRole('button', { name: /user management/i });
        fireEvent.click(usersTab);
      });
      
      await waitFor(() => {
        expect(screen.getByText('No users found')).toBeInTheDocument();
        expect(screen.getByText('Get started by creating a new user.')).toBeInTheDocument();
      });
    });
  });

  describe('Create User Modal', () => {
    beforeEach(() => {
      mockAuthContext.isAdmin = true;
    });

    it('opens create user modal when Add User button is clicked', async () => {
      renderAdmin();
      
      await waitFor(() => {
        const usersTab = screen.getByRole('button', { name: /user management/i });
        fireEvent.click(usersTab);
      });
      
      await waitFor(() => {
        const addUserButton = screen.getByRole('button', { name: 'Add User' });
        fireEvent.click(addUserButton);
        
        expect(screen.getByText('Create New User')).toBeInTheDocument();
      });
    });

    it('renders all form fields in create user modal', async () => {
      renderAdmin();
      
      await waitFor(() => {
        const usersTab = screen.getByRole('button', { name: /user management/i });
        fireEvent.click(usersTab);
      });
      
      await waitFor(() => {
        const addUserButton = screen.getByRole('button', { name: 'Add User' });
        fireEvent.click(addUserButton);
        
        expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByLabelText('Role')).toBeInTheDocument();
      });
    });

    it('closes modal when Cancel button is clicked', async () => {
      renderAdmin();
      
      await waitFor(() => {
        const usersTab = screen.getByRole('button', { name: /user management/i });
        fireEvent.click(usersTab);
      });
      
      await waitFor(() => {
        const addUserButton = screen.getByRole('button', { name: 'Add User' });
        fireEvent.click(addUserButton);
        
        const cancelButton = screen.getByRole('button', { name: 'Cancel' });
        fireEvent.click(cancelButton);
        
        expect(screen.queryByText('Create New User')).not.toBeInTheDocument();
      });
    });

    it('closes modal when X button is clicked', async () => {
      renderAdmin();
      
      await waitFor(() => {
        const usersTab = screen.getByRole('button', { name: /user management/i });
        fireEvent.click(usersTab);
      });
      
      await waitFor(() => {
        const addUserButton = screen.getByRole('button', { name: 'Add User' });
        fireEvent.click(addUserButton);
        
        const closeButton = screen.getByRole('button', { name: '' }); // X button
        fireEvent.click(closeButton);
        
        expect(screen.queryByText('Create New User')).not.toBeInTheDocument();
      });
    });

    it('submits form with valid data', async () => {
      mockApiService.post.mockResolvedValueOnce({});
      
      renderAdmin();
      
      await waitFor(() => {
        const usersTab = screen.getByRole('button', { name: /user management/i });
        fireEvent.click(usersTab);
      });
      
      await waitFor(() => {
        const addUserButton = screen.getByRole('button', { name: 'Add User' });
        fireEvent.click(addUserButton);
        
        fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'New User' } });
        fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'new@example.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText('Role'), { target: { value: UserRole.USER } });
        
        const createButton = screen.getByRole('button', { name: 'Create User' });
        fireEvent.click(createButton);
      });
      
      await waitFor(() => {
        expect(mockApiService.post).toHaveBeenCalledWith('/admin/users', {
          name: 'New User',
          email: 'new@example.com',
          password: 'password123',
          role: UserRole.USER,
        });
      });
    });
  });

  describe('User Actions', () => {
    beforeEach(() => {
      mockAuthContext.isAdmin = true;
    });

    it('toggles user status when activate/deactivate button is clicked', async () => {
      mockApiService.patch.mockResolvedValueOnce({});
      
      renderAdmin();
      
      await waitFor(() => {
        const usersTab = screen.getByRole('button', { name: /user management/i });
        fireEvent.click(usersTab);
      });
      
      await waitFor(() => {
        const deactivateButton = screen.getAllByText('Deactivate')[0];
        fireEvent.click(deactivateButton);
      });
      
      await waitFor(() => {
        expect(mockApiService.patch).toHaveBeenCalledWith('/admin/users/1/deactivate', {});
      });
    });

    it('activates inactive user when activate button is clicked', async () => {
      mockApiService.patch.mockResolvedValueOnce({});
      
      renderAdmin();
      
      await waitFor(() => {
        const usersTab = screen.getByRole('button', { name: /user management/i });
        fireEvent.click(usersTab);
      });
      
      await waitFor(() => {
        const activateButton = screen.getByText('Activate');
        fireEvent.click(activateButton);
      });
      
      await waitFor(() => {
        expect(mockApiService.patch).toHaveBeenCalledWith('/admin/users/3/activate', {});
      });
    });

    it('deletes user with confirmation', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      mockApiService.delete.mockResolvedValueOnce({});
      
      renderAdmin();
      
      await waitFor(() => {
        const usersTab = screen.getByRole('button', { name: /user management/i });
        fireEvent.click(usersTab);
      });
      
      await waitFor(() => {
        const deleteButton = screen.getAllByText('Delete')[0];
        fireEvent.click(deleteButton);
      });
      
      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this user? This action cannot be undone.');
      
      await waitFor(() => {
        expect(mockApiService.delete).toHaveBeenCalledWith('/admin/users/1');
      });
      
      confirmSpy.mockRestore();
    });

    it('does not delete user when confirmation is cancelled', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      
      renderAdmin();
      
      await waitFor(() => {
        const usersTab = screen.getByRole('button', { name: /user management/i });
        fireEvent.click(usersTab);
      });
      
      await waitFor(() => {
        const deleteButton = screen.getAllByText('Delete')[0];
        fireEvent.click(deleteButton);
      });
      
      expect(confirmSpy).toHaveBeenCalled();
      expect(mockApiService.delete).not.toHaveBeenCalled();
      
      confirmSpy.mockRestore();
    });
  });

  describe('System Configuration Tab', () => {
    beforeEach(() => {
      mockAuthContext.isAdmin = true;
    });

    it('displays system configuration interface', async () => {
      renderAdmin();
      
      await waitFor(() => {
        const systemTab = screen.getByRole('button', { name: /system configuration/i });
        fireEvent.click(systemTab);
        
        expect(screen.getByText('System Configuration')).toBeInTheDocument();
        expect(screen.getByText('Application Settings')).toBeInTheDocument();
        expect(screen.getByText('Security Settings')).toBeInTheDocument();
      });
    });

    it('shows configuration cards with options', async () => {
      renderAdmin();
      
      await waitFor(() => {
        const systemTab = screen.getByRole('button', { name: /system configuration/i });
        fireEvent.click(systemTab);
        
        expect(screen.getByText('Configure general application behavior')).toBeInTheDocument();
        expect(screen.getByText('Configure security and authentication options')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockAuthContext.isAdmin = true;
    });

    it('displays error message when API call fails', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('API Error'));
      
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load dashboard statistics')).toBeInTheDocument();
      });
    });

    it('allows dismissing error messages', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('API Error'));
      
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load dashboard statistics')).toBeInTheDocument();
        
        const dismissButton = screen.getByRole('button', { name: '' }); // X button in error
        fireEvent.click(dismissButton);
        
        expect(screen.queryByText('Failed to load dashboard statistics')).not.toBeInTheDocument();
      });
    });
  });
});