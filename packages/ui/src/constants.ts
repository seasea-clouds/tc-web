export const WHATSAPP_URL = 'https://wa.me/message/HPPZ5X6XZSMLM1';

/** Shared brand identity for all SinoTrade Compliance websites */
export const BRAND_NAME = 'SinoTrade Compliance';
export const SITE_URL = 'https://sinotradecompliance.com';

/** 48 supported locales — shared across site, portal, and blog */
export const LOCALES = [
  'en','zh','es','fr','de','ja','pt','ru',
  'ar','ko','it','nl','tr','vi','id','th',
  'hi','pl','sv','el','cs','ro','hu','fi',
  'da','no','uk','bg','hr','sr','sk','sl',
  'ms','ka','he','sw','bn','ca',
  'fa','ur','ta','af','sq','az','hy','be','ne','si',
];
export const DEFAULT_LOCALE = 'en';

/** Browser language → locale matching (shared by dev middleware and CF worker) */
export function matchBrowserLanguage(acceptLanguage: string | null, supported: string[] = LOCALES, defaultLocale: string = DEFAULT_LOCALE): string {
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
