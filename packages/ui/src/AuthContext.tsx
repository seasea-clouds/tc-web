'use client';

import { createContext, useContext, type ReactNode } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  /** @internal True when AuthProvider is present in tree */
  _hasProvider?: boolean;
}

const noop = async () => {};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  login: noop as (email: string, password: string, rememberMe?: boolean) => Promise<void>,
  register: noop as (email: string, password: string, name?: string) => Promise<void>,
  logout: noop as () => Promise<void>,
  _hasProvider: false,
});

export { AuthContext };

/**
 * Safe hook — never throws.
 * When no AuthProvider ancestor exists, returns safe defaults
 * (unauthenticated, noop functions).
 */
export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
