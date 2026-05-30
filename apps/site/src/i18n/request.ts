import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './routing';

import type { Locale } from './routing';

export default getRequestConfig(async ({ locale }) => {
  const validLocale = locales.includes(locale as Locale) ? locale : defaultLocale;

  return {
    locale: validLocale as string,
    messages: (await import(`../../messages/${validLocale}.json`)).default,
    onError(error) {
      // During SSG build, MISSING_MESSAGE errors crash the build even when caught.
      // Return the key itself so callers like getNumberedItems can detect missing
      // keys via `val.includes('.')` and break gracefully.
      if (error.code === 'MISSING_MESSAGE') return;
      console.error(error);
    },
  };
});
