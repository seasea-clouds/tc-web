'use client';

import { useState } from 'react';
import { useTradeLocale } from './TranslationProvider';

interface LanguageSwitcherProps {
  locale?: string;
  locales?: string[];
  localeNames?: Record<string, string>;
  onLocaleChange?: (newLocale: string) => void;
}

const DEFAULT_LOCALES = ['en','zh','es','fr','de','ja','pt','ru','ar','ko','it','nl','tr','vi','id','th','hi','pl','sv','el','cs','ro','hu','fi','da','no','uk','bg','hr','sr','sk','sl','ms','ka','he','sw','bn','ca','fa','ur','ta','af','sq','az','hy','be','ne','si'];

const DEFAULT_LOCALE_NAMES: Record<string, string> = {
  en: '🇬🇧 English',
  zh: '🇨🇳 中文',
  es: '🇪🇸 Español',
  fr: '🇫🇷 Français',
  de: '🇩🇪 Deutsch',
  ja: '🇯🇵 日本語',
  pt: '🇵🇹 Português',
  ru: '🇷🇺 Русский',
  ar: '🇸🇦 العربية',
  ko: '🇰🇷 한국어',
  it: '🇮🇹 Italiano',
  nl: '🇳🇱 Nederlands',
  tr: '🇹🇷 Türkçe',
  vi: '🇻🇳 Tiếng Việt',
  id: '🇮🇩 Bahasa Indonesia',
  th: '🇹🇭 ภาษาไทย',
  hi: '🇮🇳 हिन्दी',
  pl: '🇵🇱 Polski',
  sv: '🇸🇪 Svenska',
  el: '🇬🇷 Ελληνικά',
  cs: '🇨🇿 Čeština',
  ro: '🇷🇴 Română',
  hu: '🇭🇺 Magyar',
  fi: '🇫🇮 Suomi',
  da: '🇩🇰 Dansk',
  no: '🇳🇴 Norsk',
  uk: '🇺🇦 Українська',
  bg: '🇧🇬 Български',
  hr: '🇭🇷 Hrvatski',
  sr: '🇷🇸 Српски',
  sk: '🇸🇰 Slovenčina',
  sl: '🇸🇮 Slovenščina',
  ms: '🇲🇾 Bahasa Melayu',
  ka: '🇬🇪 ქართული',
  he: '🇮🇱 עברית',
  sw: '🇹🇿 Kiswahili',
  bn: '🇧🇩 বাংলা',
  ca: '🏳️ Català',
  fa: '🇮🇷 فارسی',
  ur: '🇵🇰 اردو',
  ta: '🇮🇳 தமிழ்',
  af: '🇿🇦 Afrikaans',
  sq: '🇦🇱 Shqip',
  az: '🇦🇿 Azərbaycan',
  hy: '🇦🇲 Հայերեն',
  be: '🇧🇾 Беларуская',
  ne: '🇳🇵 नेपाली',
  si: '🇱🇰 සිංහල',
};

export default function LanguageSwitcher({
  locale: propLocale,
  locales = DEFAULT_LOCALES,
  localeNames = DEFAULT_LOCALE_NAMES,
  onLocaleChange,
}: LanguageSwitcherProps) {
  const ctxLocale = useTradeLocale();
  const locale = propLocale || ctxLocale || 'en';
  const [open, setOpen] = useState(false);

  const handleChange = (newLocale: string) => {
    if (newLocale === locale) return;
    setOpen(false);

    if (onLocaleChange) {
      onLocaleChange(newLocale);
      return;
    }

    localStorage.setItem('compli-service-locale', newLocale);
    const path = window.location.pathname;
    const newPath = path.replace(`/${locale}/`, `/${newLocale}/`);
    window.location.href = newPath;
  };

  const currentDisplayName = localeNames[locale]?.split(' ').slice(1).join(' ') || locale;

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-white/80 hover:text-white transition-colors text-sm"
      >
        <span className="text-base">🌐</span>
        <span className="hidden sm:inline">{currentDisplayName}</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full bg-white rounded-md shadow-lg border border-gray-200 pt-2 pb-1 min-w-[140px] max-h-[32rem] overflow-y-auto z-50"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#D4AF37 #f1f1f1' }}
        >
          {locales.map((l: string) => (
            <button
              key={l}
              type="button"
              onClick={() => handleChange(l)}
              className={`block w-full text-left px-4 py-1.5 text-sm transition-colors ${
                l === locale
                  ? 'text-primary-navy font-semibold bg-bg-ice'
                  : 'text-text-charcoal hover:bg-bg-ice hover:text-primary-navy'
              }`}
            >
              {localeNames[l] || l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
