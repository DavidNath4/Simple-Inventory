import { render, screen, fireEvent } from '@testing-library/react';
import UserCard from '../UserCard';
import { User, UserRole } from '../../../types';

const mockUser: User = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  role: UserRole.USER,
  isActive: true,
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-02T00:00:00.000Z',
};

const mockAdminUser: User = {
  id: '2',
  name: 'Admin User',
  email: 'admin@example.com',
  role: UserRole.ADMIN,
  isActive: true,
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-02T00:00:00.000Z',
};

const mockInactiveUser: User = {
  ...mockUser,
  isActive: false,
};

describe('UserCard Component', () => {
  const defaultProps = {
    user: mockUser,
    onToggleStatus: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user information correctly', () => {
    render(<UserCard {...defaultProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('J')).toBeInTheDocument(); // Avatar initial
  });

  it('displays USER role badge with correct styling', () => {
    render(<UserCard {...defaultProps} />);
    
    const roleBadge = screen.getByText('USER');
    expect(roleBadge).toBeInTheDocument();
    expect(roleBadge).toHaveClass('bg-primary-100', 'text-primary-800');
  });

  it('displays ADMIN role badge with correct styling', () => {
    render(<UserCard {...defaultProps} user={mockAdminUser} />);
    
    const roleBadge = screen.getByText('ADMIN');
    expect(roleBadge).toBeInTheDocument();
    expect(roleBadge).toHaveClass('bg-error-100', 'text-error-800');
  });

  it('displays active status with correct styling', () => {
    render(<UserCard {...defaultProps} />);
    
    const statusBadge = screen.getByText('Active');
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge).toHaveClass('bg-success-100', 'text-success-800');
  });

  it('displays inactive status with correct styling', () => {
    render(<UserCard {...defaultProps} user={mockInactiveUser} />);
    
    const statusBadge = screen.getByText('Inactive');
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-800');
  });

  it('shows Deactivate button for active users', () => {
    render(<UserCard {...defaultProps} />);
    
    const deactivateButton = screen.getByRole('button', { name: 'Deactivate' });
    expect(deactivateButton).toBeInTheDocument();
    expect(deactivateButton).toHaveClass('text-warning-700', 'bg-warning-100');
  });

  it('shows Activate button for inactive users', () => {
    render(<UserCard {...defaultProps} user={mockInactiveUser} />);
    
    const activateButton = screen.getByRole('button', { name: 'Activate' });
    expect(activateButton).toBeInTheDocument();
    expect(activateButton).toHaveClass('text-success-700', 'bg-success-100');
  });

  it('calls onToggleStatus when toggle button is clicked', () => {
    const onToggleStatus = jest.fn();
    render(<UserCard {...defaultProps} onToggleStatus={onToggleStatus} />);
    
    const toggleButton = screen.getByRole('button', { name: 'Deactivate' });
    fireEvent.click(toggleButton);
    
    expect(onToggleStatus).toHaveBeenCalledTimes(1);
    expect(onToggleStatus).toHaveBeenCalledWith(mockUser);
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = jest.fn();
    render(<UserCard {...defaultProps} onDelete={onDelete} />);
    
    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButton);
    
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(mockUser.id);
  });

  it('renders edit button when onEdit prop is provided', () => {
    const onEdit = jest.fn();
    render(<UserCard {...defaultProps} onEdit={onEdit} />);
    
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('does not render edit button when onEdit prop is not provided', () => {
    render(<UserCard {...defaultProps} />);
    
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();
    render(<UserCard {...defaultProps} onEdit={onEdit} />);
    
    const editButton = screen.getByRole('button', { name: 'Edit' });
    fireEvent.click(editButton);
    
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(mockUser);
  });

  it('disables all buttons when loading is true', () => {
    render(<UserCard {...defaultProps} loading />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('displays formatted creation and update dates', () => {
    render(<UserCard {...defaultProps} />);
    
    expect(screen.getByText(/Created: 1\/1\/2023/)).toBeInTheDocument();
    expect(screen.getByText(/Updated: 1\/2\/2023/)).toBeInTheDocument();
  });

  it('renders user card with proper structure', () => {
    render(<UserCard {...defaultProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });
});