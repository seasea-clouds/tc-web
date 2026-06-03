'use client';

import { useAuth } from '@/components/AuthProvider';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { API_BASE } from '@/lib/constants';

interface Subscription {
  id: string;
  plan: string;
  status: string;
  current_period_end: string;
}

function BillingContent() {
  const t = useTranslations('Dashboard');
  const { user } = useAuth();
  const [sub, setSub] = useState<Subscription | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/subscription`, {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((data) => setSub(data.subscription || null))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-[#1B365D] mb-8">{t('billing')}</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-[#1B365D] mb-4">{t('currentPlan')}</h2>
        {sub ? (
          <div className="space-y-2">
            <p className="text-sm"><strong>{t('plan')}:</strong> {sub.plan}</p>
            <p className="text-sm"><strong>{t('status')}:</strong> {sub.status}</p>
            <p className="text-sm"><strong>{t('periodEnds')}:</strong> {sub.current_period_end}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{t('youAreOnFreePlan')}</p>
            <Link
              href="/pricing"
              className="inline-block bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#1B365D] font-semibold px-4 py-2 rounded-md text-sm transition-all"
            >
              View Pricing
            </Link>
          </>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="font-semibold text-[#1B365D] mb-2">{t('account')}</h2>
        <p className="text-sm text-gray-500">{user?.email}</p>
        <p className="text-xs text-gray-400 mt-1">{t('registeredUser')}</p>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <ProtectedRoute>
      <BillingContent />
    </ProtectedRoute>
  );
}
