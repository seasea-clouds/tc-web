import { defineRouting } from 'next-intl/routing';

const localeList = ['en','zh','es','fr','de','ja','pt','ru'] as const;

export const locales = localeList;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const routing = defineRouting({
  locales: [...localeList],
  defaultLocale: 'en',
  localePrefix: 'always',
});
