import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';
import { AuthProvider } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import { User, UserRole } from '../../types';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useNavigate: () => mockNavigate,
}));

// Mock AuthContext
const mockLogin = jest.fn();
const mockAuthContext = {
  user: null,
  token: null,
  isAuthenticated: false,
  isAdmin: false,
  login: mockLogin,
  logout: jest.fn(),
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock API service
jest.mock('../../services/api', () => ({
  post: jest.fn(),
  setToken: jest.fn(),
}));

const mockApiService = apiService as jest.Mocked<typeof apiService>;

const renderLogin = () => {
  return render(
    <AuthProvider>
      <Login />
    </AuthProvider>
  );
};

describe('Login Page', () => {
  const mockUser: User = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: UserRole.USER,
    isActive: true,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

  const mockAuthResponse = {
    user: mockUser,
    token: 'mock-jwt-token',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders login form with all elements', () => {
      renderLogin();
      
      expect(screen.getByText('Inventory Management')).toBeInTheDocument();
      expect(screen.getByText('Sign in to your account to continue')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('displays demo credentials section', () => {
      renderLogin();
      
      expect(screen.getByText('Demo Credentials')).toBeInTheDocument();
      expect(screen.getByText('admin@inventory.com')).toBeInTheDocument();
      expect(screen.getByText('user@inventory.com')).toBeInTheDocument();
      expect(screen.getByText('password123')).toBeInTheDocument();
    });

    it('renders password field with toggle visibility button', () => {
      renderLogin();
      
      const passwordField = screen.getByLabelText('Password');
      expect(passwordField).toHaveAttribute('type', 'password');
      
      const toggleButton = screen.getByRole('button', { name: '' }); // Icon button
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows email validation error when email is invalid', async () => {
      renderLogin();
      
      const emailField = screen.getByLabelText('Email Address');
      fireEvent.change(emailField, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailField);
      
      await waitFor(() => {
        expect(screen.getByText('Email format is invalid')).toBeInTheDocument();
      });
    });

    it('shows email required error when email is empty', async () => {
      renderLogin();
      
      const emailField = screen.getByLabelText('Email Address');
      fireEvent.blur(emailField);
      
      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });
    });

    it('shows password validation error when password is too short', async () => {
      renderLogin();
      
      const passwordField = screen.getByLabelText('Password');
      fireEvent.change(passwordField, { target: { value: '123' } });
      fireEvent.blur(passwordField);
      
      await waitFor(() => {
        expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
      });
    });

    it('shows password required error when password is empty', async () => {
      renderLogin();
      
      const passwordField = screen.getByLabelText('Password');
      fireEvent.blur(passwordField);
      
      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });

    it('clears validation errors when user starts typing', async () => {
      renderLogin();
      
      const emailField = screen.getByLabelText('Email Address');
      fireEvent.blur(emailField);
      
      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });
      
      fireEvent.change(emailField, { target: { value: 'test@example.com' } });
      
      await waitFor(() => {
        expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('toggles password visibility when eye icon is clicked', () => {
      renderLogin();
      
      const passwordField = screen.getByLabelText('Password');
      const toggleButton = screen.getByRole('button', { name: '' }); // Icon button
      
      expect(passwordField).toHaveAttribute('type', 'password');
      
      fireEvent.click(toggleButton);
      expect(passwordField).toHaveAttribute('type', 'text');
      
      fireEvent.click(toggleButton);
      expect(passwordField).toHaveAttribute('type', 'password');
    });

    it('updates form values when user types', () => {
      renderLogin();
      
      const emailField = screen.getByLabelText('Email Address') as HTMLInputElement;
      const passwordField = screen.getByLabelText('Password') as HTMLInputElement;
      
      fireEvent.change(emailField, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordField, { target: { value: 'password123' } });
      
      expect(emailField.value).toBe('test@example.com');
      expect(passwordField.value).toBe('password123');
    });

    it('prevents form submission when validation fails', async () => {
      renderLogin();
      
      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      fireEvent.click(submitButton);
      
      expect(mockApiService.post).not.toHaveBeenCalled();
    });
  });

  describe('Login Process', () => {
    it('successfully logs in user with valid credentials', async () => {
      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: mockAuthResponse,
      });
      
      renderLogin();
      
      const emailField = screen.getByLabelText('Email Address');
      const passwordField = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      
      fireEvent.change(emailField, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordField, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockApiService.post).toHaveBeenCalledWith('/auth/login', {
          email: 'test@example.com',
          password: 'password123',
        });
      });
      
      expect(mockApiService.setToken).toHaveBeenCalledWith('mock-jwt-token');
      expect(mockLogin).toHaveBeenCalledWith(mockUser, 'mock-jwt-token');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('shows loading state during login process', async () => {
      mockApiService.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderLogin();
      
      const emailField = screen.getByLabelText('Email Address');
      const passwordField = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      
      fireEvent.change(emailField, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordField, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      expect(screen.getByText('Signing in...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('displays error message when login fails', async () => {
      mockApiService.post.mockRejectedValueOnce(new Error('Invalid credentials'));
      
      renderLogin();
      
      const emailField = screen.getByLabelText('Email Address');
      const passwordField = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      
      fireEvent.change(emailField, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordField, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('displays generic error message when API response is unsuccessful', async () => {
      mockApiService.post.mockResolvedValueOnce({
        success: false,
        data: null,
      });
      
      renderLogin();
      
      const emailField = screen.getByLabelText('Email Address');
      const passwordField = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      
      fireEvent.change(emailField, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordField, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Login failed. Please try again.')).toBeInTheDocument();
      });
    });

    it('clears general error when user starts typing', async () => {
      mockApiService.post.mockRejectedValueOnce(new Error('Invalid credentials'));
      
      renderLogin();
      
      const emailField = screen.getByLabelText('Email Address');
      const passwordField = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      
      fireEvent.change(emailField, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordField, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
      
      // Start typing to clear error
      fireEvent.change(emailField, { target: { value: 'test2@example.com' } });
      
      await waitFor(() => {
        expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
      });
    });

    it('disables form fields during loading', async () => {
      mockApiService.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderLogin();
      
      const emailField = screen.getByLabelText('Email Address');
      const passwordField = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      
      fireEvent.change(emailField, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordField, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      expect(emailField).toBeDisabled();
      expect(passwordField).toBeDisabled();
    });
  });
});