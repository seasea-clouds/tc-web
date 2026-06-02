import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { locales, defaultLocale } from '@/i18n/routing';
import { messagesMap } from '@/i18n/messages';
import { Footer, SearchProvider, ActionDock, TradeTranslationProvider, OrganizationJsonLd } from '@trade/ui';
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

  return (
    <html lang={locale}>
    <head>
      {/* Cloudflare Web Analytics */}
      <script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "6639e56f244348cda996b883cecc51b7"}'></script>
    </head>
    <body className="min-h-screen flex flex-col pb-16 md:pb-0 antialiased">
      <NextIntlClientProvider messages={messages} locale={locale} timeZone="Asia/Shanghai">
        <TradeTranslationProvider messages={messages} locale={locale}>
          <OrganizationJsonLd />
          <SearchProvider />
          <main className="flex-1">{children}</main>
          <Footer />
          <ActionDock />
        </TradeTranslationProvider>
      </NextIntlClientProvider>
    </body>
    </html>
  );
}
