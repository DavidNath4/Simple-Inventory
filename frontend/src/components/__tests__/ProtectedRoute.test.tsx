import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { AuthProvider } from '../../contexts/AuthContext';
import { User, UserRole } from '../../types';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate-to">{to}</div>,
}));

// Mock AuthContext
const mockAuthContext = {
  user: null as User | null,
  token: null,
  isAuthenticated: false,
  isAdmin: false,
  login: jest.fn(),
  logout: jest.fn(),
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

const renderProtectedRoute = (requireAdmin = false) => {
  return render(
    <AuthProvider>
      <ProtectedRoute requireAdmin={requireAdmin}>
        <TestComponent />
      </ProtectedRoute>
    </AuthProvider>
  );
};

describe('ProtectedRoute Component', () => {
  const mockUser: User = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: UserRole.USER,
    isActive: true,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

  const mockAdminUser: User = {
    ...mockUser,
    name: 'Admin User',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthContext.user = null;
    mockAuthContext.isAuthenticated = false;
    mockAuthContext.isAdmin = false;
  });

  describe('Authentication Protection', () => {
    it('redirects to login when user is not authenticated', () => {
      renderProtectedRoute();
      
      expect(screen.getByTestId('navigate-to')).toHaveTextContent('/login');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('renders children when user is authenticated', () => {
      mockAuthContext.user = mockUser;
      mockAuthContext.isAuthenticated = true;
      
      renderProtectedRoute();
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument();
    });
  });

  describe('Admin Authorization', () => {
    it('allows regular users to access non-admin routes', () => {
      mockAuthContext.user = mockUser;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isAdmin = false;
      
      renderProtectedRoute(false);
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument();
    });

    it('redirects regular users away from admin routes', () => {
      mockAuthContext.user = mockUser;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isAdmin = false;
      
      renderProtectedRoute(true);
      
      expect(screen.getByTestId('navigate-to')).toHaveTextContent('/dashboard');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('allows admin users to access admin routes', () => {
      mockAuthContext.user = mockAdminUser;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isAdmin = true;
      
      renderProtectedRoute(true);
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument();
    });

    it('allows admin users to access non-admin routes', () => {
      mockAuthContext.user = mockAdminUser;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isAdmin = true;
      
      renderProtectedRoute(false);
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('redirects to login when user is null but isAuthenticated is true', () => {
      mockAuthContext.user = null;
      mockAuthContext.isAuthenticated = true;
      
      renderProtectedRoute();
      
      expect(screen.getByTestId('navigate-to')).toHaveTextContent('/login');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('redirects to dashboard when admin route is required but user role is not ADMIN', () => {
      mockAuthContext.user = { ...mockUser, role: UserRole.USER };
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isAdmin = false;
      
      renderProtectedRoute(true);
      
      expect(screen.getByTestId('navigate-to')).toHaveTextContent('/dashboard');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('handles inactive users correctly', () => {
      mockAuthContext.user = { ...mockUser, isActive: false };
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isAdmin = false;
      
      renderProtectedRoute();
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });
});