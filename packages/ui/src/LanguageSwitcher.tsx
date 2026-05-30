'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useLayoutEffect } from 'react';

interface LanguageSwitcherProps {
  locale?: string;
  locales?: string[];
  localeNames?: Record<string, string>;
  onLocaleChange?: (newLocale: string) => void;
}

const DEFAULT_LOCALES = ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko', 'pt', 'ru', 'ar', 'hi', 'th', 'vi', 'id', 'ms', 'tl', 'my', 'km', 'lo', 'mn', 'ne', 'si', 'ur', 'bn', 'pa', 'gu', 'mr', 'or', 'ta', 'te', 'kn', 'ml', 'si', 'ps', 'fa', 'ku', 'ckb', 'he', 'am', 'ti', 'sw', 'ha', 'yo', 'ig', 'zu', 'xh', 'st', 'tn', 'ts'];
const DEFAULT_LOCALE_NAMES: Record<string, string> = {
  en: '🇬🇧 English', zh: '🇨🇳 中文', es: '🇪🇸 Español', fr: '🇫🇷 Français',
  de: '🇩🇪 Deutsch', ja: '🇯🇵 日本語', ko: '🇰🇷 한국어', pt: '🇵🇹 Português',
  ru: '🇷🇺 Русский', ar: '🇸🇦 العربية',
};

export default function LanguageSwitcher({
  locale: propLocale,
  locales = DEFAULT_LOCALES,
  localeNames = DEFAULT_LOCALE_NAMES,
  onLocaleChange,
}: LanguageSwitcherProps) {
  const nextLocale = useLocale();
  const locale = propLocale || nextLocale;
  const [rendered, setRendered] = useState(false);
  const router = useRouter();

  useLayoutEffect(() => {
    setRendered(true);
  }, []);

  const handleChange = (newLocale: string) => {
    if (newLocale === locale) return;
    if (onLocaleChange) {
      onLocaleChange(newLocale);
      return;
    }
    localStorage.setItem('compli-service-locale', newLocale);
    const path = window.location.pathname;
    const newPath = path.replace(`/${locale}/`, `/${newLocale}/`);
    router.push(newPath);
  };

  if (!rendered) return null;

  return (
    <div className="relative group">
      <button type="button" className="flex items-center gap-1 text-white/80 hover:text-white transition-colors text-sm">
        <span className="text-base">🌐</span>
        <span className="hidden sm:inline">{localeNames[locale]?.split(' ').slice(1).join(' ')}</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className="absolute right-0 top-full bg-white rounded-md shadow-lg border border-gray-200 pt-2 pb-1 min-w-[140px] max-h-[32rem] overflow-y-auto opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50" style={{ scrollbarWidth: 'thin', scrollbarColor: '#D4AF37 #f1f1f1' }}>
        {locales.map((l: string) => (
          <button
            type="button"
            key={l}
            onClick={() => handleChange(l)}
            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 transition-colors ${
              l === locale ? 'bg-primary-navy/10 font-semibold' : ''
            }`}
          >
            {localeNames[l] || l}
          </button>
        ))}
      </div>
    </div>
  );
}
