import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navigation from '../Navigation';
import { AuthProvider } from '../../contexts/AuthContext';
import { User, UserRole } from '../../types';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Link: ({ to, children, className, onClick }: any) => (
    <a href={to} className={className} onClick={onClick}>{children}</a>
  ),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/dashboard' }),
}));

// Mock AuthContext
const mockLogout = jest.fn();
const mockAuthContext = {
  user: null as User | null,
  token: null,
  isAuthenticated: false,
  isAdmin: false,
  login: jest.fn(),
  logout: mockLogout,
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const renderNavigation = () => {
  return render(
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
};

describe('Navigation Component', () => {
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
    mockAuthContext.user = mockUser;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.isAdmin = false;
  });

  it('renders navigation with logo and title', () => {
    renderNavigation();
    
    expect(screen.getByText('Inventory Management')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /inventory management/i })).toHaveAttribute('href', '/dashboard');
  });

  it('displays user information correctly', () => {
    renderNavigation();
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('J')).toBeInTheDocument(); // Avatar initial
    expect(screen.getByText('USER')).toBeInTheDocument();
  });

  it('shows standard navigation links for regular users', () => {
    renderNavigation();
    
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /inventory/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin panel/i })).not.toBeInTheDocument();
  });

  it('shows admin navigation link for admin users', () => {
    mockAuthContext.user = mockAdminUser;
    mockAuthContext.isAdmin = true;
    
    renderNavigation();
    
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /inventory/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /admin panel/i })).toBeInTheDocument();
  });

  it('displays correct role badge styling for regular users', () => {
    renderNavigation();
    
    const roleBadge = screen.getByText('USER');
    expect(roleBadge).toHaveClass('bg-primary-100', 'text-primary-800');
  });

  it('displays correct role badge styling for admin users', () => {
    mockAuthContext.user = mockAdminUser;
    mockAuthContext.isAdmin = true;
    
    renderNavigation();
    
    const roleBadge = screen.getByText('ADMIN');
    expect(roleBadge).toHaveClass('bg-error-100', 'text-error-800');
  });

  it('calls logout and navigates when logout button is clicked', () => {
    renderNavigation();
    
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutButton);
    
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('toggles mobile menu when hamburger button is clicked', () => {
    renderNavigation();
    
    const mobileMenuButton = screen.getByRole('button', { name: /open main menu/i });
    fireEvent.click(mobileMenuButton);
    
    // Mobile menu should be visible
    expect(screen.getByText('Sign out')).toBeInTheDocument();
    
    // Click again to close
    fireEvent.click(mobileMenuButton);
  });

  it('shows admin link in mobile menu for admin users', () => {
    mockAuthContext.user = mockAdminUser;
    mockAuthContext.isAdmin = true;
    
    renderNavigation();
    
    const mobileMenuButton = screen.getByRole('button', { name: /open main menu/i });
    fireEvent.click(mobileMenuButton);
    
    const adminLinks = screen.getAllByText(/admin panel/i);
    expect(adminLinks.length).toBeGreaterThan(0);
  });

  it('closes mobile menu when navigation link is clicked', () => {
    renderNavigation();
    
    const mobileMenuButton = screen.getByRole('button', { name: /open main menu/i });
    fireEvent.click(mobileMenuButton);
    
    // Mobile menu should be visible
    expect(screen.getByText('Sign out')).toBeInTheDocument();
    
    // Click a navigation link
    const dashboardLink = screen.getAllByText('Dashboard')[1]; // Mobile version
    fireEvent.click(dashboardLink);
    
    // Mobile menu should close (Sign out should not be visible)
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
  });

  it('calls logout when mobile sign out is clicked', () => {
    renderNavigation();
    
    const mobileMenuButton = screen.getByRole('button', { name: /open main menu/i });
    fireEvent.click(mobileMenuButton);
    
    const signOutButton = screen.getByText('Sign out');
    fireEvent.click(signOutButton);
    
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('applies active styling to current page link', () => {
    renderNavigation();
    
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveClass('bg-primary-100', 'text-primary-700');
  });

  it('displays user avatar initial correctly', () => {
    mockAuthContext.user = { ...mockUser, name: 'Alice Smith' };
    
    renderNavigation();
    
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});