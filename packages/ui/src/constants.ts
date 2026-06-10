export const WHATSAPP_URL = 'https://wa.me/message/HPPZ5X6XZSMLM1';

/** Shared brand identity for all SinoTrade Compliance websites */
export const BRAND_NAME = 'SinoTrade Compliance';
export const SITE_URL = 'https://sinotradecompliance.com';

/** 48 supported locales — shared across site, portal, and blog */
import localeList from '../locales.json';
export const LOCALES: readonly string[] = localeList;
export const DEFAULT_LOCALE = 'en';

export type Locale = (typeof LOCALES)[number];

/**
 * Human-readable locale names with flag emoji — shared across all apps.
 */
export const LOCALE_NAMES: Record<string, string> = {
  en: '🇬🇧 English',
  zh: '🇨🇳 中文',
  es: '🇪🇸 Español',
  fr: '🇫🇷 Français',
  de: '🇩🇪 Deutsch',
  ja: '🇯🇵 日本語',
  pt: '🇧🇷 Português',
  ru: '🇷🇺 Русский',
  ar: '🇸🇦 العربية',
  ko: '🇰🇷 한국어',
  it: '🇮🇹 Italiano',
  nl: '🇳🇱 Nederlands',
  tr: '🇹🇷 Türkçe',
  vi: '🇻🇳 Tiếng Việt',
  id: '🇮🇩 Bahasa Indonesia',
  th: '🇹🇭 ไทย',
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
  sr: '🇷🇸 Srpski',
  sk: '🇸🇰 Slovenčina',
  sl: '🇸🇮 Slovenščina',
  ms: '🇲🇾 Bahasa Melayu',
  ka: '🇬🇪 ქართული',
  he: '🇮🇱 עברית',
  sw: '🇰🇪 Kiswahili',
  bn: '🇧🇩 বাংলা',
  ca: '🇦🇩 Català',
  fa: '🇮🇷 فارسی',
  ur: '🇵🇰 اردو',
  ta: '🇱🇰 தமிழ்',
  af: '🇿🇦 Afrikaans',
  sq: '🇦🇱 Shqip',
  az: '🇦🇿 Azərbaycan',
  hy: '🇦🇲 Հայերեն',
  be: '🇧🇾 Беларуская',
  ne: '🇳🇵 नेपाली',
  si: '🇱🇰 සිංහල',
};

/**
 * Locale → flag country code mapping for flagcdn.com images.
 * Used for CSS flag sprites in LanguageSwitcher.
 */
export const LOCALE_FLAG_CODES: Record<string, string> = {
  en: 'gb', zh: 'cn', es: 'es', fr: 'fr', de: 'de', ja: 'jp', pt: 'br', ru: 'ru',
  ar: 'sa', ko: 'kr', it: 'it', nl: 'nl', tr: 'tr', vi: 'vn', id: 'id', th: 'th',
  hi: 'in', pl: 'pl', sv: 'se', el: 'gr', cs: 'cz', ro: 'ro', hu: 'hu', fi: 'fi',
  da: 'dk', no: 'no', uk: 'ua', bg: 'bg', hr: 'hr', sr: 'rs', sk: 'sk', sl: 'si',
  ms: 'my', ka: 'ge', he: 'il', sw: 'ke', bn: 'bd', ca: 'ad', fa: 'ir', ur: 'pk',
  ta: 'lk', af: 'za', sq: 'al', az: 'az', hy: 'am', be: 'by', ne: 'np', si: 'lk',
};

/** Browser language → locale matching (shared by dev middleware and CF worker) */
export function matchBrowserLanguage(acceptLanguage: string | null, supported: string[] = LOCALES as unknown as string[], defaultLocale: string = DEFAULT_LOCALE): string {
  if (!acceptLanguage) return defaultLocale;
  const prefs = acceptLanguage.split(',').map((p) => {
    const [lang, q] = p.trim().split(';');
    return { lang: lang.split('-')[0].trim(), q: parseFloat(q?.replace('q=', '') || '1') };
  }).sort((a, b) => b.q - a.q);
  for (const { lang } of prefs) {
    const match = supported.find((l) => l.toLowerCase() === lang.toLowerCase());
    if (match) return match;
  }
  return defaultLocale;
}
