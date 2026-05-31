import fs from 'fs';
import path from 'path';

const cache = new Map<string, Record<string, any>>();

/**
 * Read blog messages JSON for a locale.
 * Merges English messages as defaults for missing namespaces.
 */
export function getMessages(locale: string): Record<string, any> {
  const cached = cache.get(locale);
  if (cached) return cached;

  try {
    const filePath = path.join(process.cwd(), 'messages', `${locale}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      // Merge English defaults for missing namespaces
      const enPath = path.join(process.cwd(), 'messages', 'en.json');
      if (fs.existsSync(enPath)) {
        const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
        for (const ns of Object.keys(enData)) {
          if (!data[ns]) {
            data[ns] = enData[ns];
          }
        }
      }
      cache.set(locale, data);
      return data;
    }
  } catch { /* fall through */ }

  // Fallback to English
  const enPath = path.join(process.cwd(), 'messages', 'en.json');
  const data = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
  cache.set(locale, data);
  return data;
}

/**
 * Lookup a translated string from a namespace.key, with fallback.
 */
export function t(
  locale: string,
  namespace: string,
  key: string,
  fallback?: string,
): string {
  const msgs = getMessages(locale);
  return (
    msgs?.[namespace]?.[key] ??
    fallback ??
    key
  );
}
