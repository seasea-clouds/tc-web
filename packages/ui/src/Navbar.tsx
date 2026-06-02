'use client';

import { MessageCircle, ChevronDown, Search } from 'lucide-react';
import { WHATSAPP_URL } from './constants';
import LanguageSwitcher from './LanguageSwitcher';
import { useT, useTradeLocale } from './TranslationProvider';

interface NavbarProps {
  onSearchOpen?: () => void;
  freeCheckHref?: string;
  blogHref?: string;
  locale?: string;
  industries?: { slug: string; emoji: string }[];
}

const DEFAULT_INDUSTRIES = [
  { slug: 'dairy-milk-products', emoji: '🥛' },
  { slug: 'meat-seafood', emoji: '🥩' },
  { slug: 'wine-spirits', emoji: '🍷' },
  { slug: 'skincare-cosmetics', emoji: '💄' },
  { slug: 'pet-food', emoji: '🐾' },
  { slug: 'health-supplements', emoji: '💊' },
  { slug: 'baby-maternal', emoji: '👶' },
  { slug: 'consumer-electronics', emoji: '📱' },
  { slug: 'medical-devices', emoji: '🏥' },
  { slug: 'cross-border-ecommerce', emoji: '🛒' },
];

const serviceLinks = [
  { key: 'gacc', href: '/services/gacc/', emoji: '📋' },
  { key: 'label', href: '/services/label/', emoji: '🏷️' },
  { key: 'ccc', href: '/services/ccc/', emoji: '✅' },
  { key: 'cosmetics', href: '/services/cosmetics/', emoji: '💄' },
  { key: 'ecommerce', href: '/services/ecommerce/', emoji: '🌐' },
  { key: 'brand', href: '/services/brand/', emoji: '🛡️' },
];

export default function Navbar(props: NavbarProps) {
  const { onSearchOpen, freeCheckHref, industries = DEFAULT_INDUSTRIES } = props;
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
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">{t('whatsapp')}</span>
            </a>

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
