import { getTranslations } from 'next-intl/server';
import { locales, defaultLocale } from '@/i18n/routing';
import { buildAlternates } from '@trade/ui';

/**
 * Blog segment layout — provides hreflang alternates for all /blog/ pages.
 *
 * Only renders {children} — the actual HTML layout is handled by the parent [locale]/layout.tsx.
 * This layout exists solely to provide per-segment alternates metadata (hreflang + x-default).
 * Each blog page overrides only `canonical` via its own generateMetadata.
 */
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const validLocale = locales.includes(locale as any) ? locale : defaultLocale;

  const t = await getTranslations({ locale: validLocale, namespace: 'Blog' });

  const title = t('metaTitle') || 'China Import Compliance Blog | SinoTrade Compliance';
  const description = t('metaDescription') || 'Expert guides on China import compliance. GACC registration, CCC certification, NMPA cosmetics filing, and cross-border e-commerce.';
  const path = '/blog/';
  const alternates = buildAlternates(validLocale, [...locales], path);

  return {
    title,
    description,
    alternates,
  };
}
