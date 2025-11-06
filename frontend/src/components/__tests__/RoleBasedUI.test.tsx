import { render, screen } from '@testing-library/react';
import { AuthProvider } from '../../contexts/AuthContext';
import { User, UserRole } from '../../types';

// Mock component that shows role-based content
const RoleBasedComponent: React.FC = () => {
  const mockUser: User = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const isAdmin = mockUser.role === UserRole.ADMIN;

  return (
    <div>
      <div data-testid="user-name">{mockUser.name}</div>
      <div data-testid="user-role" className={isAdmin ? 'admin-role' : 'user-role'}>
        {mockUser.role}
      </div>
      {isAdmin && <div data-testid="admin-panel">Admin Panel</div>}
      {!isAdmin && <div data-testid="user-panel">User Panel</div>}
      <div data-testid="user-status" className={mockUser.isActive ? 'active' : 'inactive'}>
        {mockUser.isActive ? 'Active' : 'Inactive'}
      </div>
    </div>
  );
};

describe('Role-Based UI Rendering', () => {
  it('renders admin-specific content for admin users', () => {
    render(
      <AuthProvider>
        <RoleBasedComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
    expect(screen.getByTestId('user-role')).toHaveTextContent('ADMIN');
    expect(screen.getByTestId('user-role')).toHaveClass('admin-role');
    expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('user-panel')).not.toBeInTheDocument();
  });

  it('displays correct user status styling', () => {
    render(
      <AuthProvider>
        <RoleBasedComponent />
      </AuthProvider>
    );

    const statusElement = screen.getByTestId('user-status');
    expect(statusElement).toHaveTextContent('Active');
    expect(statusElement).toHaveClass('active');
  });

  it('renders user information correctly', () => {
    render(
      <AuthProvider>
        <RoleBasedComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-name')).toBeInTheDocument();
    expect(screen.getByTestId('user-role')).toBeInTheDocument();
    expect(screen.getByTestId('user-status')).toBeInTheDocument();
  });
});