import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { locales, defaultLocale } from '@/i18n/routing';
import { messagesMap } from '@/i18n/messages';
import { TradeTranslationProvider } from '@trade/ui';
import SearchProvider from '@/components/SearchProvider';
import { Footer } from '@trade/ui';
import OrganizationJsonLd from '@/components/OrganizationJsonLd';
import QuickActionDock from '@/components/QuickActionDock';
import LocaleSync from '@/components/LocaleSync';
import { BRAND_NAME, SITE_URL } from '@/config/metadata';
import '../../globals.css';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * Route-aware metadata generator.
 * Detects the current route pattern and generates appropriate title/description.
 * This replaces the previous behavior where ALL pages shared the same Home metadata.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Home' });

  // Default: homepage metadata
  // Page-level generateMetadata will override this for specific pages
  return {
    title: t('metaTitle') || t('heroTitle'),
    description: t('metaDescription') || t('heroSubtitle'),
    alternates: {
      canonical: `${SITE_URL}/${locale}/`,
      languages: Object.fromEntries(
        locales.map((l) => [l, `${SITE_URL}/${l}/`])
      ),
    },
    openGraph: {
      title: t('metaTitle') || t('heroTitle'),
      description: t('metaDescription') || t('heroSubtitle'),
      locale,
      alternateLocale: locales.filter((l) => l !== locale),
      siteName: BRAND_NAME,
      url: `${SITE_URL}/${locale}/`,
      type: 'website',
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = (await params).locale;
  const resolvedParams = await params;

  const messages = messagesMap[locale] ?? messagesMap[defaultLocale];
  const buildTime = process.env.VERCEL_DEPLOYMENT_ID
    ? process.env.VERCEL_DEPLOYMENT_ID
    : process.env.CF_PAGES_COMMIT_SHA
      ? process.env.CF_PAGES_COMMIT_SHA.slice(0, 7)
      : new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');

  return (
    <html lang={locale}>
    <head>
      <meta name="build-commit" content={buildTime} />
      <meta name="build-time" content={new Date().toISOString()} />
      {/* Cloudflare Web Analytics */}
      <script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "6639e56f244348cda996b883cecc51b7"}'></script>
    </head>
    <body className="pb-16 md:pb-0 antialiased">
      <script type="application/json" id="build-info" dangerouslySetInnerHTML={{
        __html: JSON.stringify({ commit: buildTime, time: new Date().toISOString() })
      }} />
      <NextIntlClientProvider messages={messages} locale={locale}>
        <TradeTranslationProvider messages={messages} locale={locale}>
          <OrganizationJsonLd locale={resolvedParams.locale} />
          <SearchProvider />
          {children}
          <Footer />
          <QuickActionDock />
          <LocaleSync />
        </TradeTranslationProvider>
      </NextIntlClientProvider>
    </body>
    </html>
  );
}
