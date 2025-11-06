import { renderHook, act } from '@testing-library/react';
import { useFormValidation, commonValidationRules } from '../useFormValidation';

describe('useFormValidation Hook', () => {
    const initialValues = {
        email: '',
        password: '',
        name: '',
    };

    const validationRules = {
        email: commonValidationRules.email,
        password: commonValidationRules.password,
        name: commonValidationRules.name,
    };

    it('initializes with provided initial values', () => {
        const { result } = renderHook(() =>
            useFormValidation(initialValues, validationRules)
        );

        expect(result.current.values).toEqual(initialValues);
        expect(result.current.errors).toEqual({});
        expect(result.current.touched).toEqual({});
    });

    it('updates field value when handleChange is called', () => {
        const { result } = renderHook(() =>
            useFormValidation(initialValues, validationRules)
        );

        act(() => {
            result.current.handleChange('email', 'test@example.com');
        });

        expect(result.current.values.email).toBe('test@example.com');
    });

    it('clears field error when handleChange is called', () => {
        const { result } = renderHook(() =>
            useFormValidation(initialValues, validationRules)
        );

        // First set an error
        act(() => {
            result.current.handleBlur('email');
        });

        expect(result.current.errors.email).toBeTruthy();

        // Then change the field value
        act(() => {
            result.current.handleChange('email', 'test@example.com');
        });

        expect(result.current.errors.email).toBe('');
    });

    it('validates field on blur and sets error', () => {
        const { result } = renderHook(() =>
            useFormValidation(initialValues, validationRules)
        );

        act(() => {
            result.current.handleBlur('email');
        });

        expect(result.current.errors.email).toBe('Email is required');
        expect(result.current.touched.email).toBe(true);
    });

    it('validates email format correctly', () => {
        const { result } = renderHook(() =>
            useFormValidation({ email: 'invalid-email' }, validationRules)
        );

        act(() => {
            result.current.handleBlur('email');
        });

        expect(result.current.errors.email).toBe('Email format is invalid');
    });

    it('validates password length correctly', () => {
        const { result } = renderHook(() =>
            useFormValidation({ ...initialValues, password: '123' }, validationRules)
        );

        act(() => {
            result.current.handleBlur('password');
        });

        expect(result.current.errors.password).toBe('Password must be at least 6 characters');
    });

    it('validates name length correctly', () => {
        const { result } = renderHook(() =>
            useFormValidation({ ...initialValues, name: 'A' }, validationRules)
        );

        act(() => {
            result.current.handleBlur('name');
        });

        expect(result.current.errors.name).toBe('Name must be at least 2 characters');
    });

    it('validates entire form and returns validation status', () => {
        const { result } = renderHook(() =>
            useFormValidation(initialValues, validationRules)
        );

        // Test with invalid data
        act(() => {
            result.current.handleChange('email', 'invalid');
            result.current.handleChange('password', '123');
            result.current.handleChange('name', 'A');
        });

        let isValid;
        act(() => {
            isValid = result.current.validateForm();
        });

        expect(isValid).toBe(false);
        expect(Object.keys(result.current.errors)).toHaveLength(3);

        // Test with valid data
        act(() => {
            result.current.handleChange('email', 'test@example.com');
            result.current.handleChange('password', 'password123');
            result.current.handleChange('name', 'John Doe');
        });

        act(() => {
            isValid = result.current.validateForm();
        });

        expect(isValid).toBe(true);
        expect(Object.keys(result.current.errors).filter(key => result.current.errors[key])).toHaveLength(0);
    });

    it('resets form to initial values', () => {
        const { result } = renderHook(() =>
            useFormValidation(initialValues, validationRules)
        );

        // Change some values and add errors
        act(() => {
            result.current.handleChange('email', 'test@example.com');
            result.current.handleChange('password', 'password123');
            result.current.handleBlur('name'); // This will create an error
        });

        expect(result.current.values.email).toBe('test@example.com');
        expect(result.current.errors.name).toBeTruthy();

        // Reset form
        act(() => {
            result.current.resetForm();
        });

        expect(result.current.values).toEqual(initialValues);
        expect(result.current.errors).toEqual({});
        expect(result.current.touched).toEqual({});
    });

    it('sets field value directly with setFieldValue', () => {
        const { result } = renderHook(() =>
            useFormValidation(initialValues, validationRules)
        );

        act(() => {
            result.current.setFieldValue('email', 'direct@example.com');
        });

        expect(result.current.values.email).toBe('direct@example.com');
    });

    it('sets field error directly with setFieldError', () => {
        const { result } = renderHook(() =>
            useFormValidation(initialValues, validationRules)
        );

        act(() => {
            result.current.setFieldError('email', 'Custom error message');
        });

        expect(result.current.errors.email).toBe('Custom error message');
    });

    it('correctly identifies invalid fields with isFieldInvalid', () => {
        const { result } = renderHook(() =>
            useFormValidation(initialValues, validationRules)
        );

        // Field not touched yet
        expect(result.current.isFieldInvalid('email')).toBeFalsy();

        // Touch field and create error
        act(() => {
            result.current.handleBlur('email');
        });

        expect(result.current.isFieldInvalid('email')).toBe(true);

        // Fix the error
        act(() => {
            result.current.handleChange('email', 'test@example.com');
        });

        act(() => {
            result.current.handleBlur('email');
        });

        expect(result.current.isFieldInvalid('email')).toBe(false);
    });

    it('handles custom validation rules', () => {
        const customRules = {
            customField: {
                required: true,
                custom: (value: string) => {
                    if (value && value.includes('forbidden')) {
                        return 'This word is not allowed';
                    }
                    return null;
                },
            },
        };

        const { result } = renderHook(() =>
            useFormValidation({ customField: 'forbidden word' }, customRules)
        );

        act(() => {
            result.current.handleBlur('customField');
        });

        expect(result.current.errors.customField).toBe('This word is not allowed');
    });
});