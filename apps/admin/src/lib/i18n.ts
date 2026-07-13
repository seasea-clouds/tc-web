/**
 * Admin i18n — simple t() for internal admin panel
 *
 * Admin is Chinese-first (used by the China team).
 * Messages stored in apps/admin/messages/{locale}.json
 * Default locale: zh-CN
 *
 * Both zh and en are bundled at build time (static export compatible).
 */

import zhMessages from '../../messages/zh.json';
import enMessages from '../../messages/en.json';

export type AdminLocale = 'zh-CN' | 'en';

const ALL_MESSAGES: Record<string, Record<string, string>> = {
  'zh-CN': zhMessages as Record<string, string>,
  'en': enMessages as Record<string, string>,
};

const DEFAULT_LOCALE: AdminLocale = 'zh-CN';

/**
 * Build a t() function for the given locale.
 * Falls back to zh-CN for any missing key.
 */
export function buildAdminT(locale: AdminLocale = DEFAULT_LOCALE) {
  const messages = ALL_MESSAGES[locale] || ALL_MESSAGES[DEFAULT_LOCALE];
  const fallback = ALL_MESSAGES[DEFAULT_LOCALE];

  return (key: string, fallbackText?: string): string => {
    return messages[key] || fallback[key] || fallbackText || key;
  };
}

export type TFunction = ReturnType<typeof buildAdminT>;
