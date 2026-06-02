import fs from 'fs';
import path from 'path';

const cache = new Map<string, Record<string, any>>();

const SHARED_DIR = path.resolve(process.cwd(), '../../packages/ui/messages');

/**
 * Read blog messages JSON for a locale, merged with shared UI messages.
 * Shared messages (Footer, Search) from packages/ui/messages/.
 */
export function getMessages(locale: string): Record<string, any> {
  const cached = cache.get(locale);
  if (cached) return cached;

  // Load shared messages
  let shared: Record<string, any> = {};
  const sharedPath = path.join(SHARED_DIR, `${locale}.json`);
  try {
    if (fs.existsSync(sharedPath)) {
      shared = JSON.parse(fs.readFileSync(sharedPath, 'utf-8'));
    }
  } catch { /* ignore */ }

  // Load app messages
  let data: Record<string, any> = { ...shared };
  try {
    const filePath = path.join(process.cwd(), 'messages', `${locale}.json`);
    if (fs.existsSync(filePath)) {
      const appData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      data = { ...data, ...appData };
    }
  } catch { /* fall through */ }

  // Merge English defaults for missing namespaces
  try {
    const enPath = path.join(process.cwd(), 'messages', 'en.json');
    if (fs.existsSync(enPath)) {
      const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
      for (const ns of Object.keys(enData)) {
        if (!data[ns]) {
          data[ns] = enData[ns];
        }
      }
    }
  } catch { /* ignore */ }

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
