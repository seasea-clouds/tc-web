import { LOCALES, DEFAULT_LOCALE } from '@trade/ui/constants';

export const locales = [...LOCALES] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale = DEFAULT_LOCALE satisfies Locale;
