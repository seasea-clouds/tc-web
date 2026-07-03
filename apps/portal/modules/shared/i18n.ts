/**
 * 模块 i18n 助手 — 用于 checkXxx() 函数内的同步翻译
 *
 * 在 report page 渲染时，check function 在客户端用 `buildT(locale)` 获取翻译函数。
 * 当翻译 key 在目标 locale 中不存在时，自动降级到 en.json 的对应值（P4）。
 * 开发环境下同时输出 console.warn 警告（P3c）。
 */
import enMsgs from '../../messages/en.json';

const CACHE: Record<string, Record<string, string>> = {};

// Pre-cache English namespace on module load
const EN_NS = (enMsgs as Record<string, any>)?.Check || {};
const EN_CACHE_KEY = 'en:Check';
CACHE[EN_CACHE_KEY] = EN_NS as Record<string, string>;

export function buildT(locale: string = 'en', namespace: string = 'Check'): (key: string) => string {
  const cacheKey = `${locale}:${namespace}`;
  if (!CACHE[cacheKey]) {
    try {
      const msgs = locale === 'en' || !locale ? enMsgs : require(`../../messages/${locale}.json`);
      CACHE[cacheKey] = (msgs as Record<string, any>)?.[namespace] || {};
    } catch {
      CACHE[cacheKey] = CACHE[EN_CACHE_KEY] || EN_NS;
    }
  }
  const ns = CACHE[cacheKey];
  const enNs = CACHE[EN_CACHE_KEY];

  return (key: string) => {
    const val = (ns as Record<string, string>)[key];
    if (val) return val;

    // P4: fallback to English if locale lacks the key
    const enVal = enNs?.[key];
    if (enVal) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[i18n] Missing key "${key}" in ${locale}.Check, fell back to en`);
      }
      return enVal as string;
    }

    // Last resort: return raw key (should never happen with CI check-t-keys)
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[i18n] Missing key "${key}" in both ${locale}.Check and en.Check`);
    }
    return key;
  };
}
