'use client';
import { useT } from '@trade/ui';

import { useState, useEffect } from 'react';
import { useAuth } from '@trade/ui';
import Link from 'next/link';

export default function MyReportsPage() {
  const t = useT('Report');
  const { user, isLoading } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch('/api/reports/list', { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setReports(data.reports || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  if (isLoading) return <Loading />;
  if (!user) return <NotLoggedIn />;

  return (
    <div className="bg-bg-ice py-12">
      <div className="max-w-4xl mx-auto px-4">
        <Link href="./" className="text-sm text-gray-500 hover:text-primary-navy transition-colors">&larr; Back to Account</Link>
        <h1 className="text-2xl font-bold text-primary-navy mt-4 mb-6">{t('myReports')}</h1>

        {loading ? (
          <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto" /></div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">{t('noReports')}.</p>
            <Link href="../check/gacc" className="inline-block mt-4 bg-gold hover:bg-gold/90 text-primary-navy font-semibold px-6 py-2.5 rounded-md transition-all">
              Run a Check
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r: any) => (
              <Link key={r.id} href={`../report/?id=${r.id}`} className="block bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-primary-navy">{r.module || 'Report'}</p>
                    <p className="text-sm text-gray-500 mt-1">{t('reportId')}: {r.id}</p>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full ${r.payment_status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {r.payment_status === 'completed' ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
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
