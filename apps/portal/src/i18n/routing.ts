import { defineRouting } from 'next-intl/routing';
import { LOCALES, DEFAULT_LOCALE } from '@trade/ui/constants';

export const locales = [...LOCALES] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = DEFAULT_LOCALE;

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
});
