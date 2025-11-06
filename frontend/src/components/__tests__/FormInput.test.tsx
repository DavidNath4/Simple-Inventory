import { render, screen, fireEvent } from '@testing-library/react';
import FormInput from '../FormInput';

describe('FormInput Component', () => {
  const defaultProps = {
    label: 'Test Label',
    name: 'test',
    value: '',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with label and input', () => {
    render(<FormInput {...defaultProps} />);
    
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    const errorMessage = 'This field is required';
    render(<FormInput {...defaultProps} error={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('form-input-error');
  });

  it('displays helper text when no error is present', () => {
    const helperText = 'Enter your information here';
    render(<FormInput {...defaultProps} helperText={helperText} />);
    
    expect(screen.getByText(helperText)).toBeInTheDocument();
  });

  it('does not display helper text when error is present', () => {
    const helperText = 'Enter your information here';
    const errorMessage = 'This field is required';
    render(<FormInput {...defaultProps} error={errorMessage} helperText={helperText} />);
    
    expect(screen.queryByText(helperText)).not.toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders left icon when provided', () => {
    const leftIcon = <span data-testid="left-icon">📧</span>;
    render(<FormInput {...defaultProps} leftIcon={leftIcon} />);
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('pl-10');
  });

  it('renders right icon as button when onRightIconClick is provided', () => {
    const rightIcon = <span data-testid="right-icon">👁️</span>;
    const onRightIconClick = jest.fn();
    render(<FormInput {...defaultProps} rightIcon={rightIcon} onRightIconClick={onRightIconClick} />);
    
    const rightIconButton = screen.getByRole('button');
    expect(rightIconButton).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    
    fireEvent.click(rightIconButton);
    expect(onRightIconClick).toHaveBeenCalledTimes(1);
  });

  it('renders right icon as static element when onRightIconClick is not provided', () => {
    const rightIcon = <span data-testid="right-icon">👁️</span>;
    render(<FormInput {...defaultProps} rightIcon={rightIcon} />);
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('calls onChange when input value changes', () => {
    const onChange = jest.fn();
    render(<FormInput {...defaultProps} onChange={onChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('applies disabled state correctly', () => {
    render(<FormInput {...defaultProps} disabled />);
    
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('generates correct input id from label', () => {
    render(<FormInput {...defaultProps} label="Email Address" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'input-email-address');
  });

  it('uses provided id when specified', () => {
    render(<FormInput {...defaultProps} id="custom-id" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'custom-id');
  });
});