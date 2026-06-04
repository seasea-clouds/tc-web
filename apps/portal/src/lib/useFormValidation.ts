'use client';

import { useState } from 'react';

/**
 * Shared form validation hook for all check forms.
 * Returns fieldErrors state + validate function + clearFieldError.
 */
export function useFormValidation() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /** Run validation. Returns true if valid, false + sets fieldErrors if not. */
  const validate = (
    input: Record<string, string>,
    requiredFields: string[]
  ): boolean => {
    const errors: Record<string, string> = {};
    for (const field of requiredFields) {
      if (!input[field] || input[field].trim() === '') {
        errors[field] = 'This field is required';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearFieldError = (name: string) => {
    setFieldErrors(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const clearErrors = () => setFieldErrors({});

  return { fieldErrors, validate, clearFieldError, clearErrors };
}

/** Helper: CSS classes for an input with optional field error */
export function inputClasses(hasError: boolean): string {
  const base = 'w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:border-transparent';
  if (hasError) {
    return `${base} border-red-400 focus:ring-red-400`;
  }
  return `${base} border-gray-300 focus:ring-[#D4AF37]`;
}

/** Helper: CSS classes for a select with optional field error */
export function selectClasses(hasError: boolean): string {
  const base = 'w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:border-transparent';
  if (hasError) {
    return `${base} border-red-400 focus:ring-red-400`;
  }
  return `${base} border-gray-300 focus:ring-[#D4AF37]`;
}
