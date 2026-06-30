'use client';
import { useT } from '@trade/ui';

import { useState, useEffect } from 'react';
import { useAuth } from '@trade/ui';
import Link from 'next/link';

const PAGE_SIZE = 20;

const MODULE_T_KEY: Record<string, string> = {
  'GACC Food Registration': 'reportModuleGacc',
  'CCC Certification': 'reportModuleCcc',
  'NMPA Cosmetics Filing': 'reportModuleNmpa',
  'Cross-Border E-commerce': 'reportModuleCrossborder',
  'Brand Protection': 'reportModuleTrademark',
  'Chinese Label Compliance': 'reportModuleLabel',
};

function translateModule(t: (key: string) => string, module: string): string {
  const tKey = MODULE_T_KEY[module];
  return tKey ? t(tKey) : module;
}

export default function MyReportsPage() {
  const t = useT('Check');
  const tR = useT('Report');
  const { user, isLoading } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (!user) return;
    const offset = page * PAGE_SIZE;
    fetch(`/api/reports/list?limit=${PAGE_SIZE}&offset=${offset}`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : { reports: [], total: 0 })
      .then(data => {
        setReports(data.reports || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, page]);

  if (isLoading) return <Loading />;
  if (!user) return <NotLoggedIn />;

  return (
    <div className="bg-bg-ice py-12">
      <div className="max-w-4xl mx-auto px-4">
        <Link href="../" className="text-sm text-gray-500 hover:text-primary-navy transition-colors">{tR('backToAccount')}</Link>
        <h1 className="text-2xl font-bold text-primary-navy mt-4 mb-6">{tR('myReports')}</h1>

        {loading ? (
          <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto" /></div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">{tR('noReports')}</p>
            <Link href="../../" className="inline-block mt-4 bg-gold hover:bg-gold/90 text-primary-navy font-semibold px-6 py-2.5 rounded-md transition-all">
              {tR('runACheck')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r: any) => (
              <Link key={r.id} href={`../report/?id=${r.id}`} className="block bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-primary-navy">{translateModule(t, r.module) || 'Report'}</p>
                    <p className="text-sm text-gray-500 mt-1">{tR('reportId')}: {r.id}</p>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full ${r.payment_status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {r.payment_status === 'completed' ? tR('paid') : tR('pending')}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${page === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-primary-navy hover:bg-gray-100'}`}
                >
                  {tR('prevPage')}
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={`w-8 h-8 text-sm rounded-md transition-all ${i === page ? 'bg-primary-navy text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${page >= totalPages - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-primary-navy hover:bg-gray-100'}`}
                >
                  {tR('nextPage')}
                </button>
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
