import React, { forwardRef } from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      onRightIconClick,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const hasError = !!error;

    const inputClasses = [
      hasError ? 'form-input-error' : 'form-input',
      leftIcon ? 'pl-10' : '',
      rightIcon ? 'pr-10' : '',
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className='w-full'>
        <label htmlFor={inputId} className='form-label'>
          {label}
        </label>
        <div className='relative'>
          {leftIcon && (
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <div className='h-5 w-5 text-gray-400'>{leftIcon}</div>
            </div>
          )}
          <input ref={ref} id={inputId} className={inputClasses} {...props} />
          {rightIcon && (
            <div className='absolute inset-y-0 right-0 pr-3 flex items-center'>
              {onRightIconClick ? (
                <button
                  type='button'
                  className='h-5 w-5 text-gray-400 hover:text-gray-600 focus:outline-none'
                  onClick={onRightIconClick}
                >
                  {rightIcon}
                </button>
              ) : (
                <div className='h-5 w-5 text-gray-400'>{rightIcon}</div>
              )}
            </div>
          )}
        </div>
        {error && <p className='form-error'>{error}</p>}
        {helperText && !error && (
          <p className='mt-1 text-sm text-gray-500'>{helperText}</p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

export default FormInput;
