import { useState, useCallback, useRef, useEffect } from 'react';
import { apiService, ApiServiceError } from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';

interface UseApiOptions {
  showSuccessNotification?: boolean;
  showErrorNotification?: boolean;
  successMessage?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: ApiServiceError) => void;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiServiceError | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T>;
  reset: () => void;
  retry: () => Promise<T>;
}

export function useApi<T = any>(
  apiCall: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const { addNotification } = useNotifications();
  const lastArgsRef = useRef<any[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: any[]): Promise<T> => {
      lastArgsRef.current = args;

      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const result = await apiCall(...args);

        if (isMountedRef.current) {
          setState(prev => ({ ...prev, data: result, loading: false }));

          // Show success notification if enabled
          if (options.showSuccessNotification && options.successMessage) {
            addNotification({
              type: 'success',
              title: 'Success',
              message: options.successMessage,
            });
          }

          // Call success callback
          options.onSuccess?.(result);
        }

        return result;
      } catch (error) {
        const apiError = error instanceof ApiServiceError 
          ? error 
          : new ApiServiceError('Unknown error occurred', 'UNKNOWN_ERROR');

        if (isMountedRef.current) {
          setState(prev => ({ ...prev, error: apiError, loading: false }));

          // Show error notification if enabled
          if (options.showErrorNotification !== false) {
            addNotification({
              type: 'error',
              title: 'Error',
              message: apiError.message,
              duration: 0, // Persistent for errors
            });
          }

          // Call error callback
          options.onError?.(apiError);
        }

        throw apiError;
      }
    },
    [apiCall, options, addNotification]
  );

  const retry = useCallback(async (): Promise<T> => {
    return execute(...lastArgsRef.current);
  }, [execute]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    retry,
    reset,
  };
}

// Specialized hooks for common operations
export function useApiMutation<T = any>(
  apiCall: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
) {
  return useApi(apiCall, {
    showSuccessNotification: true,
    showErrorNotification: true,
    ...options,
  });
}

export function useApiQuery<T = any>(
  apiCall: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
) {
  return useApi(apiCall, {
    showErrorNotification: true,
    ...options,
  });
}

// Hook for managing multiple API loading states
export function useApiLoadingStates() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading,
    }));
  }, []);

  const isLoading = useCallback((key: string): boolean => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const isAnyLoading = useCallback((): boolean => {
    return Object.values(loadingStates).some(Boolean);
  }, [loadingStates]);

  return {
    loadingStates,
    setLoading,
    isLoading,
    isAnyLoading,
  };
}

// Hook for API service configuration
export function useApiService() {
  const { addNotification } = useNotifications();

  useEffect(() => {
    // Add global error handler
    const errorHandler = (error: ApiServiceError) => {
      // Handle specific error types
      switch (error.code) {
        case 'NETWORK_ERROR':
          addNotification({
            type: 'error',
            title: 'Network Error',
            message: 'Please check your internet connection and try again.',
            duration: 0,
          });
          break;
        case 'AUTHENTICATION_ERROR':
          addNotification({
            type: 'error',
            title: 'Authentication Failed',
            message: 'Please log in again to continue.',
            duration: 0,
          });
          break;
        case 'AUTHORIZATION_ERROR':
          addNotification({
            type: 'error',
            title: 'Access Denied',
            message: 'You do not have permission to perform this action.',
            duration: 0,
          });
          break;
        case 'SERVER_ERROR':
          addNotification({
            type: 'error',
            title: 'Server Error',
            message: 'Something went wrong on our end. Please try again later.',
            duration: 0,
          });
          break;
        case 'TIMEOUT':
          addNotification({
            type: 'error',
            title: 'Request Timeout',
            message: 'The request took too long to complete. Please try again.',
            duration: 0,
          });
          break;
      }
    };

    apiService.addErrorHandler(errorHandler);

    // Cleanup is not needed as the error handler array persists
    // across component unmounts, which is desired behavior
  }, [addNotification]);

  return {
    apiService,
    isLoading: (key: string) => apiService.isLoading(key),
    getAllLoadingStates: () => apiService.getAllLoadingStates(),
  };
}