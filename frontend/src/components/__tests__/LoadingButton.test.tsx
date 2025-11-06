import { render, screen, fireEvent } from '@testing-library/react';
import LoadingButton from '../LoadingButton';

describe('LoadingButton Component', () => {
  const defaultProps = {
    children: 'Click me',
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders button with children text', () => {
    render(<LoadingButton {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('shows loading state with spinner and loading text', () => {
    render(<LoadingButton {...defaultProps} loading loadingText="Processing..." />);
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.queryByText('Click me')).not.toBeInTheDocument();
  });

  it('uses default loading text when not provided', () => {
    render(<LoadingButton {...defaultProps} loading />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('applies correct variant classes', () => {
    const { rerender } = render(<LoadingButton {...defaultProps} variant="primary" />);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');

    rerender(<LoadingButton {...defaultProps} variant="secondary" />);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');

    rerender(<LoadingButton {...defaultProps} variant="error" />);
    expect(screen.getByRole('button')).toHaveClass('btn-error');
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<LoadingButton {...defaultProps} size="sm" />);
    expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-sm');

    rerender(<LoadingButton {...defaultProps} size="md" />);
    expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2', 'text-sm');

    rerender(<LoadingButton {...defaultProps} size="lg" />);
    expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-base');
  });

  it('applies full width class when fullWidth is true', () => {
    render(<LoadingButton {...defaultProps} fullWidth />);
    
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('renders left and right icons when not loading', () => {
    const leftIcon = <span data-testid="left-icon">←</span>;
    const rightIcon = <span data-testid="right-icon">→</span>;
    
    render(<LoadingButton {...defaultProps} leftIcon={leftIcon} rightIcon={rightIcon} />);
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('does not render icons when loading', () => {
    const leftIcon = <span data-testid="left-icon">←</span>;
    const rightIcon = <span data-testid="right-icon">→</span>;
    
    render(<LoadingButton {...defaultProps} loading leftIcon={leftIcon} rightIcon={rightIcon} />);
    
    expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked and not disabled', () => {
    const onClick = jest.fn();
    render(<LoadingButton {...defaultProps} onClick={onClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when loading', () => {
    const onClick = jest.fn();
    render(<LoadingButton {...defaultProps} onClick={onClick} loading />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when disabled', () => {
    const onClick = jest.fn();
    render(<LoadingButton {...defaultProps} onClick={onClick} disabled />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('is disabled when either disabled prop or loading is true', () => {
    const { rerender } = render(<LoadingButton {...defaultProps} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();

    rerender(<LoadingButton {...defaultProps} loading />);
    expect(screen.getByRole('button')).toBeDisabled();

    rerender(<LoadingButton {...defaultProps} disabled loading />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});