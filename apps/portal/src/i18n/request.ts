import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './routing';

import type { Locale } from './routing';

export default getRequestConfig(async ({ locale }) => {
  const validLocale = locales.includes(locale as Locale) ? locale : defaultLocale;

  return {
    locale: validLocale as string,
    messages: (await import(`../../messages/${validLocale}.json`)).default,
    onError() {
      // Silently handle missing translation keys
    },
  };
});
