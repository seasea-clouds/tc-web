'use client';
import { useT, useTradeLocale } from '@trade/ui';

import { useState, useEffect } from 'react';
import { useAuth } from '@trade/ui';
import Link from 'next/link';

const PLAN_LABELS: Record<string, string> = {
  monthly: 'planMonthly',
  yearly: 'planYearly',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'statusActive',
  canceled: 'statusCanceled',
  past_due: 'statusPastDue',
};

export default function SubscriptionPage() {
  const t = useT('Report');
  const locale = useTradeLocale();
  const { user, isLoading } = useAuth();
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch('/api/subscription', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setSub(data?.subscription || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const planLabel = (plan: string) => t(PLAN_LABELS[plan.toLowerCase()] || plan);
  const statusLabel = (status: string) => t(STATUS_LABELS[status.toLowerCase()] || status);

  if (isLoading) return <Loading />;
  if (!user) return <NotLoggedIn />;

  return (
    <div className="bg-bg-ice py-12">
      <div className="max-w-3xl mx-auto px-4">
        <Link href="./" className="text-sm text-gray-500 hover:text-primary-navy transition-colors">{t('backToAccount')}</Link>
        <h1 className="text-2xl font-bold text-primary-navy mt-4 mb-6">{t('subscription')}</h1>

        {loading ? (
          <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto" /></div>
        ) : !sub ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">{t('noActiveSubscription')}</p>
            <Link href={`/${locale}/c/pricing/`} className="inline-block mt-4 bg-gold hover:bg-gold/90 text-primary-navy font-semibold px-6 py-2.5 rounded-md transition-all">
              {t('viewPlans')}
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">{t('plan')}</span>
              <span className="font-semibold text-primary-navy">{planLabel(sub.plan)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">{t('status')}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{statusLabel(sub.status)}</span>
            </div>
            {sub.current_period_start && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">{t('periodStart')}</span>
                <span className="text-sm text-gray-700">{new Date(sub.current_period_start).toLocaleDateString()}</span>
              </div>
            )}
            {sub.current_period_end && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">{t('periodEnds')}</span>
                <span className="text-sm text-gray-700">{new Date(sub.current_period_end).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Loading() {
  const t = useT('Report');
  return <div className="bg-bg-ice py-16"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto" /></div></div>;
}

function NotLoggedIn() {
  const t = useT('Report');
  return <div className="bg-bg-ice py-16"><div className="max-w-md mx-auto px-4 text-center"><h1 className="text-xl font-bold text-primary-navy mb-4">{t('pleaseLogIn')}</h1><Link href="../login" className="inline-block bg-gold hover:bg-gold/90 text-primary-navy font-semibold px-6 py-2.5 rounded-md transition-all">{t('logIn')}</Link></div></div>;
}
