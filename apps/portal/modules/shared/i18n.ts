/**
 * 模块 i18n 助手 — 用于 checkXxx() 函数内的同步翻译
 *
 * 用法:
 * ```ts
 * import { buildT } from '../../modules/shared/i18n';
 * export function checkGacc(input: GaccInput, locale?: string): GaccResult {
 *   const t = buildT(locale || 'en');
 *   ...
 *   verdictLabel: t('gaccVerdictHigh'),
 * }
 * ```
 *
 * Key fallback: 找不到翻译时返回 key 自身（显示英文 key，但线上 en.json 中有所有 key）
 */
import enMsgs from '../../messages/en.json';

const CACHE: Record<string, Record<string, string>> = {};

export function buildT(locale: string = 'en', namespace: string = 'Check'): (key: string) => string {
  const cacheKey = `${locale}:${namespace}`;
  if (!CACHE[cacheKey]) {
    try {
      const msgs = loadMessages(locale);
      CACHE[cacheKey] = (msgs as Record<string, any>)?.[namespace] || {};
    } catch {
      const msgs = enMsgs;
      CACHE[cacheKey] = (msgs as Record<string, any>)?.[namespace] || {};
    }
  }
  const ns = CACHE[cacheKey];
  return (key: string) => (ns as Record<string, string>)[key] || key;
}

function loadMessages(locale: string): Record<string, any> {
  if (locale === 'en' || !locale) return enMsgs;
  try {
    return require(`../../messages/${locale}.json`);
  } catch {
    return enMsgs;
  }
}
