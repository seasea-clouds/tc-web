import { useTradeLocale } from './TranslationProvider';
import { usePathname } from 'next/navigation';

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
  const pathname = usePathname();

  const currentDisplayName = localeNames[locale]?.split(' ').slice(1).join(' ') || locale;

  // Build locale → href map using Next.js pathname (works in SSR and client)
  const localeHrefs = locales.reduce<Record<string, string>>((acc, l) => {
    if (pathname && pathname.startsWith(`/${locale}`)) {
      acc[l] = pathname.replace(`/${locale}`, `/${l}`);
    } else if (pathname) {
      // Fallback: try current path with just the locale segment replaced
      acc[l] = pathname.replace(/^\/[a-z]{2}(?:-[A-Z]{2})?(?=\/|$)/, `/${l}`);
    }
    return acc;
  }, {});

  const handleClick = (e: React.MouseEvent, newLocale: string) => {
    if (newLocale === locale) {
      e.preventDefault();
      return;
    }
    // Save locale preference for portal (works when JS available)
    try { localStorage.setItem('compli-service-locale', newLocale); } catch {}

    if (onLocaleChange) {
      e.preventDefault();
      onLocaleChange(newLocale);
      return;
    }
    // If onLocaleChange not provided, let <a> href handle it normally
  };

  return (
    <div className="relative group">
      <button
        type="button"
        className="flex items-center gap-1 text-white/80 hover:text-white transition-colors text-sm"
      >
        <span className="text-base">🌐</span>
        <span className="hidden sm:inline">{currentDisplayName}</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {/* CSS hover/focus dropdown: works even without React hydration */}
      <div className="absolute right-0 top-full invisible group-hover:visible group-focus-within:visible opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-150 bg-white rounded-md shadow-lg border border-gray-200 pt-2 pb-1 min-w-[140px] max-h-[32rem] overflow-y-auto z-50"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#D4AF37 #f1f1f1' }}>
        {locales.map((l: string) => (
          <a
            key={l}
            href={localeHrefs[l] || `/${l}/`}
            onClick={(e) => handleClick(e, l)}
            className={`block w-full text-left px-4 py-1.5 text-sm no-underline transition-colors ${
              l === locale
                ? 'text-primary-navy font-semibold bg-bg-ice'
                : 'text-text-charcoal hover:bg-bg-ice hover:text-primary-navy'
            }`}
          >
            {localeNames[l] || l}
          </a>
        ))}
      </div>
    </div>
  );
}
