'use client';

import { type ReactNode } from 'react';
import { AuthProvider as SharedAuthProvider, useAuth as sharedUseAuth } from '@trade/ui';
import type { AuthContextType } from '@trade/ui';

/**
 * Portal AuthProvider — delegates to shared AuthProvider.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <SharedAuthProvider logoutRedirect="/en/c/login">{children}</SharedAuthProvider>;
}

/** Portal useAuth — guaranteed to have all methods available. */
export function useAuth(): Required<AuthContextType> {
  return sharedUseAuth() as Required<AuthContextType>;
}
