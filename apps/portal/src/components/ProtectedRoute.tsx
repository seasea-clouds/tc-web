'use client';

import { useEffect } from 'react';
import { useAuth } from '@trade/ui';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = './c/login';
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-ice">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-navy" />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
