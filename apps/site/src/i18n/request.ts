import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './routing';

import type { Locale } from './routing';

export default getRequestConfig(async ({ locale }) => {
  const validLocale = locales.includes(locale as Locale) ? locale : defaultLocale;

  // Load app-specific messages
  const appMessages = (await import(`../../messages/${validLocale}.json`)).default;

  // Merge shared UI messages (Navbar, Footer, Search, MobileTab, CTA, ContactForm, breadcrumb)
  let sharedMessages = {};
  try {
    sharedMessages = (await import(`../../../../packages/ui/messages/${validLocale}.json`)).default;
  } catch { /* shared messages may not have all locales */ }

  const messages = { ...sharedMessages, ...appMessages };

  return {
    locale: validLocale as string,
    messages,
    onError(error) {
      // During SSG build, MISSING_MESSAGE errors crash the build even when caught.
      // Return the key itself so callers like getNumberedItems can detect missing
      // keys via `val.includes('.')` and break gracefully.
      if (error.code === 'MISSING_MESSAGE') return;
      console.error(error);
    },
  };
});
