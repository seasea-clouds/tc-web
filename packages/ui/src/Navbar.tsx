'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, User, LogOut, FileText, Settings, CreditCard } from 'lucide-react';
import { WHATSAPP_URL } from './constants';
import { industries as INDUSTRIES } from './data/industries';
import LanguageSwitcher from './LanguageSwitcher';
import { useT, useTradeLocale } from './TranslationProvider';
import { useAuth } from './AuthContext';

interface NavbarProps {
  onSearchOpen?: () => void;
  freeCheckHref?: string;
  blogHref?: string;
  locale?: string;
  industries?: { slug: string; emoji: string }[];
  /** Login link for unauthenticated users */
  loginHref?: string;
  /** Portal base path for user dashboard links (e.g. /c) */
  portalBaseHref?: string;
}

const serviceLinks = [
  { key: 'gacc', href: '/services/gacc/', emoji: '📋' },
  { key: 'label', href: '/services/label/', emoji: '🏷️' },
  { key: 'ccc', href: '/services/ccc/', emoji: '✅' },
  { key: 'cosmetics', href: '/services/cosmetics/', emoji: '💄' },
  { key: 'ecommerce', href: '/services/ecommerce/', emoji: '🌐' },
  { key: 'brand', href: '/services/brand/', emoji: '🛡️' },
];

function UserMenu({ loginHref, locale }: { loginHref?: string; locale?: string }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const t = useT('Navbar');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (isLoading) {
    // During loading, show Sign In button if loginHref is available
    // instead of a pulse placeholder — avoids flash of gray circle
    if (loginHref) {
      return (
        <a
          href={loginHref}
          className="text-white/80 hover:text-white border border-white/30 hover:border-white/60 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
        >
          {t('signIn') || 'Sign In'}
        </a>
      );
    }
    return null;
  }

  if (!isAuthenticated || !user) {
    return loginHref ? (
      <a
        href={loginHref}
        className="text-white/80 hover:text-white border border-white/30 hover:border-white/60 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
      >
        {t('signIn') || 'Sign In'}
      </a>
    ) : null;
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
            href={`/${locale}/c/me/reports`}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-bg-ice transition-colors"
            onClick={() => setOpen(false)}
          >
            <FileText className="w-4 h-4" />
            {t('myReports')}
          </a>
          <a
            href={`/${locale}/c/me/subscription`}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-bg-ice transition-colors"
            onClick={() => setOpen(false)}
          >
            <CreditCard className="w-4 h-4" />
            {t('subscription')}
          </a>
          <a
            href={`/${locale}/c/me/settings`}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-bg-ice transition-colors"
            onClick={() => setOpen(false)}
          >
            <Settings className="w-4 h-4" />
            {t('settings')}
          </a>
          <hr className="my-1 border-gray-100" />
          <button
            onClick={async () => {
              setOpen(false);
              if (logout) await logout();
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

export default function Navbar(props: NavbarProps) {
  const { onSearchOpen, freeCheckHref, industries = INDUSTRIES } = props;
  const t = useT('Navbar');
  const ctxLocale = useTradeLocale();
  const locale = props.locale || ctxLocale || 'en';

  const href = (path: string) => `/${locale}${path}`;
  const resolveHref = (custom?: string, defaultPath?: string) =>
    custom ? custom.replace('{locale}', locale) : (defaultPath ? href(defaultPath) : href('/'));
  const fcHref = resolveHref(freeCheckHref, '/c/');
  const blogHref = resolveHref(props.blogHref, '/blog/');

  return (
    <nav className="relative z-50 bg-primary-navy/95 backdrop-blur-sm shadow-md">
      {/* 第一行：Logo + WhatsApp */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <a href={href('/')} className="text-white font-bold text-lg sm:text-xl">
            {t('logo')}
          </a>
          <div className="flex items-center gap-2">
            {onSearchOpen && (
              <button
                type="button"
                onClick={onSearchOpen}
                className="p-2 text-white/80 hover:text-white transition-colors rounded-md hover:bg-white/10"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-accent-blue hover:bg-accent-blue/90 text-white font-semibold px-3 py-1.5 rounded-md transition-all hover:shadow-md text-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="hidden sm:inline">{t('whatsapp')}</span>
            </a>

            {/* User menu — 自动处理登录态 */}
            <UserMenu loginHref={props.loginHref} locale={locale} />

            <a
              href={fcHref}
              className="bg-gold hover:bg-gold/90 text-primary-navy font-semibold px-3 py-1.5 rounded-md text-sm transition-all hover:shadow-md"
            >
              {t('freeCheck')}
            </a>
          </div>
        </div>
      </div>

      {/* 第二行：导航菜单 */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 桌面端：单行 */}
          <div className="hidden md:flex items-center justify-center h-12 space-x-8">
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-1 text-white/80 hover:text-white transition-colors text-sm font-medium"
              >
                {t('services')}
                <ChevronDown className="w-3 h-3" />
              </button>
              <div className="absolute top-full left-0 w-56 bg-white rounded-md shadow-lg py-2 z-50 max-h-[32rem] overflow-y-auto invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150" style={{ scrollbarWidth: 'thin', scrollbarColor: '#D4AF37 #f1f1f1' }}>
                {serviceLinks.map((s) => (
                  <a
                    key={s.key}
                    href={href(s.href)}
                    className="block px-4 py-2 text-sm text-text-charcoal hover:bg-bg-ice hover:text-primary-navy transition-colors"
                  >
                    {s.emoji} {t(`servicesDropdown.${s.key}`)}
                  </a>
                ))}
              </div>
            </div>

            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-1 text-white/80 hover:text-white transition-colors text-sm font-medium"
              >
                {t('industries')}
                <ChevronDown className="w-3 h-3" />
              </button>
              <div className="absolute top-full left-0 w-56 bg-white rounded-md shadow-lg py-2 z-50 max-h-[32rem] overflow-y-auto invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150" style={{ scrollbarWidth: 'thin', scrollbarColor: '#D4AF37 #f1f1f1' }}>
                {industries.map((ind) => (
                  <a
                    key={ind.slug}
                    href={href(`/industries/${ind.slug}/`)}
                    className="block px-4 py-2 text-sm text-text-charcoal hover:bg-bg-ice hover:text-primary-navy transition-colors"
                  >
                    {ind.emoji} {t(`industriesDropdown.${ind.slug.replace(/-/g, '')}`)}
                  </a>
                ))}
              </div>
            </div>

            <a href={href('/about/')} className="inline-flex items-center text-white/80 hover:text-white transition-colors text-sm font-medium">
              {t('about')}
            </a>
            <a href={href('/packages/')} className="inline-flex items-center text-white/80 hover:text-white transition-colors text-sm font-medium">
              {t('packages')}
            </a>
            <a href={href('/faq/')} className="inline-flex items-center text-white/80 hover:text-white transition-colors text-sm font-medium">
              {t('faq')}
            </a>
            <a href={blogHref} className="inline-flex items-center text-white/80 hover:text-white transition-colors text-sm font-medium">
              {t('blog')}
            </a>
            <LanguageSwitcher locale={locale} />
          </div>

          {/* 手机端：flex-wrap 允许换行 */}
          <div className="md:hidden flex flex-wrap items-center justify-center gap-x-5 gap-y-1 py-2 text-sm">
            <a href={href('/services/')} className="inline-flex items-center text-white/80 hover:text-white transition-colors">
              {t('services')}
            </a>
            <a href={href('/industries/')} className="inline-flex items-center text-white/80 hover:text-white transition-colors">
              {t('industries')}
            </a>
            <a href={href('/about/')} className="inline-flex items-center text-white/80 hover:text-white transition-colors">
              {t('about')}
            </a>
            <a href={href('/packages/')} className="inline-flex items-center text-white/80 hover:text-white transition-colors">
              {t('packages')}
            </a>
            <a href={href('/faq/')} className="inline-flex items-center text-white/80 hover:text-white transition-colors">
              {t('faq')}
            </a>
            <a href={blogHref} className="inline-flex items-center text-white/80 hover:text-white transition-colors">
              {t('blog')}
            </a>
            <LanguageSwitcher locale={locale} />
          </div>
        </div>
      </div>
    </nav>
  );
}
