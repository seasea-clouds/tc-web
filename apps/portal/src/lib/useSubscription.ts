/**
 * useSubscription hook
 * Checks if the current logged-in user has an active subscription.
 * Used by check-client pages to skip the $1.99 paywall for subscribers.
 */
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@trade/ui';

export function useSubscription() {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetch('/api/subscription', { credentials: 'include' })
      .then(res => res.ok ? res.json() : { subscription: null })
      .then(data => {
        setSubscribed(data?.subscription?.status === 'active');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  return { subscribed, loading };
}
