'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import type { AuthUser } from './AuthContext';

interface AuthProviderProps {
  children: ReactNode;
  /** Where to redirect after logout (default: /) */
  logoutRedirect?: string;
  /**
   * Always verify the session on mount, ignoring the local "logged in before"
   * hint. Required by apps whose pages depend on a real user (portal account
   * pages) — a visitor on a new device has no hint but may still hold a valid
   * session cookie.
   */
  alwaysCheck?: boolean;
}

// Local hint: "this browser has logged in at least once before".
// Pure optimisation — it lets public pages skip the /api/auth/me round-trip for
// visitors who never logged in (the vast majority of traffic, including every
// crawler, none of which carry localStorage). When the hint IS present the real
// session check still runs, and the hint is dropped as soon as the server says
// the session is gone. Never trusted for access control.
const AUTH_HINT_KEY = 'stc.auth';

function hasAuthHint(): boolean {
  try {
    return window.localStorage.getItem(AUTH_HINT_KEY) === '1';
  } catch {
    return false; // storage disabled / private mode
  }
}

function setAuthHint(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(AUTH_HINT_KEY, '1');
    else window.localStorage.removeItem(AUTH_HINT_KEY);
  } catch {
    /* storage unavailable — the behaviour degrades to "always ask", which is safe */
  }
}

/**
 * Shared AuthProvider — checks auth session via httpOnly cookie cookie on mount.
 * Works across all three apps (site/insights/portal) since they share the same domain.
 */
export function AuthProvider({ children, logoutRedirect = '/', alwaysCheck = false }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount — skipped entirely when this browser never logged in
  useEffect(() => {
    if (!alwaysCheck && !hasAuthHint()) {
      setIsLoading(false);
      return;
    }
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then(data => {
        // Session expired or revoked → drop the hint so later pages skip the call
        if (!data?.user) setAuthHint(false);
        setUser(data.user);
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, [alwaysCheck]);

  const login = useCallback(async (email: string, password: string, rememberMe = false, turnstileToken?: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe, turnstileToken }),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    setAuthHint(true);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string, turnstileToken?: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, turnstileToken }),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    const data = await res.json();
    setAuthHint(true);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}
    setAuthHint(false);
    setUser(null);
    window.location.href = logoutRedirect;
  }, [logoutRedirect]);

  return (
    <AuthContext.Provider value={{
      user, isLoading, login, register, logout,
      isAuthenticated: !!user,
      _hasProvider: true,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
