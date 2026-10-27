import { getTranslations } from 'next-intl/server';
import { locales, defaultLocale } from '@/i18n/routing';
import { buildAlternates, sharedOpenGraph, sharedTwitter } from '@trade/ui';

/**
 * Regulations segment layout — provides hreflang alternates for all /regulations/ pages.
 *
 * Only renders {children} — the actual HTML layout is handled by the parent [locale]/layout.tsx.
 * This layout exists solely to provide per-segment alternates metadata (hreflang + x-default).
 * Each regulations page overrides only `canonical` via its own generateMetadata.
 */
export default function RegulationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const validLocale = locales.includes(locale as any) ? locale : defaultLocale;

  const t = await getTranslations({ locale: validLocale, namespace: 'Regulations' });

  const title = t('metaTitle') || 'China Regulations & GACC Decrees | SinoTrade Compliance';
  const description = t('metaDescription') || 'Official Chinese customs and regulatory documents for exporters, tracked and summarised in 48 languages.';
  const path = '/regulations/';
  const alternates = buildAlternates(validLocale, [...locales], path);

  return {
    title,
    description,
    alternates,
    openGraph: sharedOpenGraph({ title, description, locale: validLocale, url: alternates.canonical }),
    twitter: sharedTwitter({ title, description }),
  };
}
