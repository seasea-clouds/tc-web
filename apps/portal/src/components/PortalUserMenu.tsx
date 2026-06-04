'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { User, ChevronDown, LogOut, FileText, Settings, CreditCard } from 'lucide-react';

export default function PortalUserMenu() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const t = useTranslations('Auth');
  const tReport = useTranslations('Report');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (isLoading) {
    return <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse" />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-1">
        <a
          href="login"
          className="text-white/80 hover:text-white border border-white/30 hover:border-white/60 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
        >
          {t('signIn') || 'Sign In'}
        </a>
        <a
          href="register"
          className="hidden sm:inline text-white/80 hover:text-white px-2 py-1.5 text-sm font-medium transition-colors"
        >
          {t('register') || 'Sign Up'}
        </a>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-white hover:text-gold transition-colors text-sm font-medium px-2 py-1 rounded-md hover:bg-white/10"
      >
        <User className="w-4 h-4" />
        <span className="hidden sm:inline max-w-[100px] truncate">
          {user.name || user.email}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <a
            href="me/reports"
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-bg-ice transition-colors"
            onClick={() => setOpen(false)}
          >
            <FileText className="w-4 h-4" />
            {tReport('myReports')}
          </a>
          <a
            href="me/subscription"
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-bg-ice transition-colors"
            onClick={() => setOpen(false)}
          >
            <CreditCard className="w-4 h-4" />
            {tReport('subscription')}
          </a>
          <a
            href="me/settings"
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-bg-ice transition-colors"
            onClick={() => setOpen(false)}
          >
            <Settings className="w-4 h-4" />
            {tReport('settings')}
          </a>
          <hr className="my-1 border-gray-100" />
          <button
            onClick={async () => {
              setOpen(false);
              await logout();
            }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
          >
            <LogOut className="w-4 h-4" />
            {t('signOut')}
          </button>
        </div>
      )}
    </div>
  );
}
