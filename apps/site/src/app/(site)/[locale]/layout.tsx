import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { locales, defaultLocale } from '@/i18n/routing';
import { messagesMap } from '@/i18n/messages';
import { Footer, SearchProvider, ActionDock, TradeTranslationProvider, OrganizationJsonLd, buildAlternates, sharedOpenGraph, sharedTwitter } from '@trade/ui';
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

  const title = t('metaTitle') || t('heroTitle') || 'SinoTrade Compliance | China Import Compliance Services';
  const description = t('metaDescription') || t('heroSubtitle') || "One-stop China import compliance: GACC registration, CCC certification, NMPA cosmetics filing, label compliance, and cross-border e-commerce.";
  const path = '/';
  const alternates = buildAlternates(locale, [...locales], path);

  return {
    title,
    description,
    alternates,
    openGraph: sharedOpenGraph({ title, description, locale, url: alternates.canonical }),
    twitter: sharedTwitter({ title, description }),
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
