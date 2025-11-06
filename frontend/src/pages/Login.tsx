import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoginRequest, AuthResponse, ApiResponse } from '../types';
import { useFormValidation, commonValidationRules } from '../hooks';
import { FormInput, LoadingButton } from '../components';
import apiService from '../services/api';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState<string>('');

  const {
    values: formData,
    errors,
    handleChange,
    handleBlur,
    validateForm,
  } = useFormValidation<LoginRequest>(
    {
      email: '',
      password: '',
    },
    {
      email: commonValidationRules.email,
      password: commonValidationRules.password,
    }
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    handleChange(name, value);

    // Clear general error when user starts typing
    if (generalError) {
      setGeneralError('');
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    handleBlur(name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setGeneralError('');

    try {
      const response = await apiService.post<ApiResponse<AuthResponse>>(
        '/auth/login',
        formData
      );

      if (response.success && response.data) {
        // Set the token in the API service
        apiService.setToken(response.data.token);

        // Update auth context
        login(response.data.user, response.data.token);

        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        setGeneralError('Login failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setGeneralError(
        error.message || 'Invalid email or password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        {/* Header */}
        <div className='text-center'>
          <div className='mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100'>
            <svg
              className='h-6 w-6 text-primary-600'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
              />
            </svg>
          </div>
          <h1 className='mt-6 text-3xl font-bold text-gray-900'>
            Inventory Management
          </h1>
          <p className='mt-2 text-sm text-gray-600'>
            Sign in to your account to continue
          </p>
        </div>

        {/* Login Form */}
        <div className='card'>
          <div className='card-body'>
            <form className='space-y-6' onSubmit={handleSubmit}>
              {/* General Error */}
              {generalError && (
                <div className='alert alert-error'>
                  <div className='flex'>
                    <svg
                      className='h-5 w-5 text-error-400 mr-2'
                      fill='currentColor'
                      viewBox='0 0 20 20'
                    >
                      <path
                        fillRule='evenodd'
                        d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                        clipRule='evenodd'
                      />
                    </svg>
                    {generalError}
                  </div>
                </div>
              )}

              {/* Email Field */}
              <FormInput
                label='Email Address'
                name='email'
                type='email'
                autoComplete='email'
                required
                placeholder='Enter your email'
                value={formData.email}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                disabled={isLoading}
                error={errors.email}
                leftIcon={
                  <svg fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207'
                    />
                  </svg>
                }
              />

              {/* Password Field */}
              <FormInput
                label='Password'
                name='password'
                type={showPassword ? 'text' : 'password'}
                autoComplete='current-password'
                required
                placeholder='Enter your password'
                value={formData.password}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                disabled={isLoading}
                error={errors.password}
                leftIcon={
                  <svg fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                    />
                  </svg>
                }
                rightIcon={
                  showPassword ? (
                    <svg fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21'
                      />
                    </svg>
                  ) : (
                    <svg fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                      />
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                      />
                    </svg>
                  )
                }
                onRightIconClick={() => setShowPassword(!showPassword)}
              />

              {/* Submit Button */}
              <LoadingButton
                type='submit'
                loading={isLoading}
                loadingText='Signing in...'
                fullWidth
                variant='primary'
              >
                Sign In
              </LoadingButton>
            </form>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className='card'>
          <div className='card-body'>
            <h3 className='text-sm font-medium text-gray-900 mb-3'>
              Demo Credentials
            </h3>
            <div className='space-y-2 text-sm text-gray-600'>
              <div className='flex justify-between'>
                <span className='font-medium'>Admin:</span>
                <span className='font-mono'>admin@inventory.com</span>
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>User:</span>
                <span className='font-mono'>user@inventory.com</span>
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>Password:</span>
                <span className='font-mono'>password123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
