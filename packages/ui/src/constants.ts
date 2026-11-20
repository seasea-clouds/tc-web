export const WHATSAPP_URL = 'https://wa.me/message/HPPZ5X6XZSMLM1';

/** Public contact mailbox (same address as the floating action dock) */
export const CONTACT_EMAIL = 'info@sinotradecompliance.com';
export const CONTACT_EMAIL_URL = `mailto:${CONTACT_EMAIL}`;

/**
 * Web3Forms 表单标识（access_key）—— 兜底值。
 *
 * 它不是密钥：页面 HTML 里本来就会输出成 `<input name="access_key" value="...">`，
 * 任何人打开源码都能看到，作用只是把提交路由到我们的收件箱。
 *
 * 为什么需要兜底：CF Pages 的 `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` 变量在
 * tc-web-insights / tc-web-regulations 两个项目上**没有注入到构建环境**
 * （构建日志 `Build environment variables: (none found)`，API 里看得到、构建时不生效，
 * 只能由 Dashboard 手动添加才生效）。缺变量 → access_key 输出空值 →
 * Web3Forms 报 `Form must include a 'form_id' (in path) or 'access_key' field`。
 *
 * 优先顺序：环境变量 > 本兜底值。Dashboard 补上变量后自动走 env。
 */
export const WEB3FORMS_ACCESS_KEY_FALLBACK = 'b1e6d34d-9fdc-4dc1-9bb2-6fc9090b361c';

/** Shared brand identity for all SinoTrade Compliance websites */
export const BRAND_NAME = 'SinoTrade Compliance';
export const SITE_URL = 'https://sinotradecompliance.com';

/** 48 supported locales — shared across site, portal, insights and regulations */
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
 * Locale → flag country code mapping for the self-hosted flags sprite
 * (public/flags.svg, symbols id="flag-<code>") used in LanguageSwitcher.
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
