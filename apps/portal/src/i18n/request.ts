import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './routing';

import type { Locale } from './routing';

export default getRequestConfig(async ({ locale }) => {
  const validLocale = locales.includes(locale as Locale) ? locale : defaultLocale;

  const appMessages = (await import(`../../messages/${validLocale}.json`)).default;

  // Merge shared UI messages (Navbar, Footer, Search)
  let sharedMessages = {};
  try {
    sharedMessages = (await import(`../../../../packages/ui/messages/${validLocale}.json`)).default;
  } catch { /* shared messages may not have all locales */ }

  const messages = { ...sharedMessages, ...appMessages };

  return {
    locale: validLocale as string,
    messages,
    onError() {
      // Silently handle missing translation keys
    },
  };
});
