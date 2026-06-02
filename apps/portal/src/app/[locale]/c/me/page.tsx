'use client';

import { useAuth } from '@/components/AuthProvider';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function MePage() {
  const { user, isLoading, logout } = useAuth();
  const t = useTranslations('Dashboard');

  if (isLoading) {
    return (
      <div className="bg-bg-ice py-16">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-bg-ice py-16">
        <div className="max-w-md mx-auto px-4 text-center">
          <h1 className="text-xl font-bold text-primary-navy mb-4">{t('pleaseLogIn')}</h1>
          <Link href="./login" className="inline-block bg-gold hover:bg-gold/90 text-primary-navy font-semibold px-6 py-2.5 rounded-md transition-all">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-ice py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-primary-navy mb-8">{t('myAccount')}</h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary-navy/10 rounded-full flex items-center justify-center text-xl font-bold text-primary-navy">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-primary-navy">{user.name}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="./me/reports" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all group">
            <div className="text-2xl mb-3">📄</div>
            <h3 className="font-semibold text-primary-navy group-hover:text-gold transition-colors">{t('myReports')}</h3>
            <p className="text-sm text-gray-500 mt-1">{t('viewReportsDesc')}</p>
          </Link>
          <Link href="./me/subscription" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all group">
            <div className="text-2xl mb-3">💳</div>
            <h3 className="font-semibold text-primary-navy group-hover:text-gold transition-colors">{t('subscription')}</h3>
            <p className="text-sm text-gray-500 mt-1">{t('manageSubscriptionDesc')}</p>
          </Link>
          <Link href="./me/settings" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all group">
            <div className="text-2xl mb-3">⚙️</div>
            <h3 className="font-semibold text-primary-navy group-hover:text-gold transition-colors">{t('settings')}</h3>
            <p className="text-sm text-gray-500 mt-1">{t('accountPreferences')}</p>
          </Link>
        </div>

        <div className="mt-8">
          <button onClick={logout} className="text-sm text-red-500 hover:text-red-700 transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
