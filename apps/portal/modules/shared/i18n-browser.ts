/**
 * 模块 i18n 助手 (Browser Version) — 用于 checkXxx() 函数内的同步翻译
 *
 * 此文件专用于浏览器 (Webpack 构建)，使用直接 require() 让 Webpack
 * 将 locale JSON 打包到浏览器 bundle 中，确保客户端翻译正常。
 *
 * Worker 部署时使用 i18n.ts (eval('require') 避免 esbuild 打包所有 JSON)。
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
      // Direct require — Webpack will bundle all matched locale JSONs
      const msgs = locale === 'en' || !locale ? enMsgs : require('../../messages/' + locale + '.json');
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
