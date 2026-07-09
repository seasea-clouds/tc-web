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
const EN_CACHE_KEY = '***';
CACHE[EN_CACHE_KEY] = EN_NS as Record<string, string>;

/**
 * Inject pre-loaded locale data into the translation cache.
 * Called by page components (e.g. report/page.tsx) to bridge
 * @trade/ui useT context data into buildT's cache, avoiding
 * the need for dynamic require() on lazy-loaded chunks.
 */
export function setLocaleData(locale: string, messages: Record<string, any>): void {
  if (!locale || locale === 'en') return;
  for (const [namespace, data] of Object.entries(messages)) {
    if (data && typeof data === 'object') {
      const cacheKey = `${locale}:${namespace}`;
      if (!CACHE[cacheKey]) {
        CACHE[cacheKey] = data as Record<string, string>;
      }
    }
  }
}

export function buildT(locale: string = 'en', namespace: string = 'Check'): (key: string) => string {
  const cacheKey = `${locale}:${namespace}`;
  const enNs = CACHE[EN_CACHE_KEY];

  // Try to load locale data once upfront
  if (!CACHE[cacheKey] && locale !== 'en') {
    try {
      // Use eval to hide require path from esbuild (prevents Worker bundle bloat)
      const msgs = eval('require')('../../messages/' + locale + '.json');
      CACHE[cacheKey] = (msgs as Record<string, any>)?.[namespace] || {};
    } catch {
      // Ignore — chunk may not have loaded yet (deferred by Webpack chunk loading).
      // Will retry on each t() call below instead of caching English fallback permanently.
    }
  }

  return (key: string) => {
    let ns = CACHE[cacheKey];

    // Retry loading the locale chunk if it wasn't ready on first attempt
    if (!ns && locale !== 'en') {
      try {
        const msgs = eval('require')('../../messages/' + locale + '.json');
        ns = (msgs as Record<string, any>)?.[namespace] || {};
        CACHE[cacheKey] = ns; // cache for subsequent lookups
      } catch {
        // Still not available, fall through to English
      }
    }

    if (ns) {
      const val = (ns as Record<string, string>)[key];
      if (val) return val;
    }

    // P4: fallback to English if locale lacks the key or chunk not yet loaded
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
