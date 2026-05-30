'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/components/AuthProvider';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

function DashboardContent() {
  const { user, logout } = useAuth();
  const t = useTranslations('Dashboard');

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[#1B365D]">{t('title')}</h1>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          {t('signOut')}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <p className="text-gray-500 text-sm">{t('welcomeBack')}</p>
        <p className="text-xl font-semibold text-[#1B365D]">{user?.name || user?.email}</p>
        <p className="text-gray-400 text-sm mt-1">{user?.email}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link
          href="/dashboard/reports"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:border-[#D4AF37] transition-colors"
        >
          <h3 className="font-semibold text-[#1B365D] mb-1">{t('myReports')}</h3>
          <p className="text-sm text-gray-500">{t('myReportsDesc')}</p>
        </Link>

        <Link
          href="/dashboard/billing"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:border-[#D4AF37] transition-colors"
        >
          <h3 className="font-semibold text-[#1B365D] mb-1">{t('billing')}</h3>
          <p className="text-sm text-gray-500">{t('billingDesc')}</p>
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
