import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { locales, defaultLocale } from '@/i18n/routing';
import { messagesMap } from '@/i18n/messages';
import { Footer, SearchProvider, CookieConsent, ActionDock, TradeTranslationProvider, OrganizationJsonLd, buildAlternates, sharedOpenGraph, sharedTwitter, AuthProvider, CfAnalytics, AutoBreadcrumb } from '@trade/ui';
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
  const validLocale = locales.includes(locale as any) ? locale : defaultLocale;
  const t = await getTranslations({ locale: validLocale, namespace: 'Home' });

  const title = t('metaTitle') || t('heroTitle') || 'SinoTrade Compliance | China Import Compliance Services';
  const description = t('metaDescription') || t('heroSubtitle') || "One-stop China import compliance: GACC registration, CCC certification, NMPA cosmetics filing, label compliance, and cross-border e-commerce.";
  const path = '/';
  const alternates = buildAlternates(validLocale, [...locales], path);

  return {
    title,
    description,
    alternates,
    openGraph: sharedOpenGraph({ title, description, locale: validLocale, url: alternates.canonical }),
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
  const { locale } = await params;
  const validLocale = locales.includes(locale as any) ? locale : defaultLocale;

  const messages = messagesMap[validLocale] ?? messagesMap[defaultLocale];

  return (
    <html lang={validLocale} dir={validLocale === 'ar' || validLocale === 'he' || validLocale === 'fa' || validLocale === 'ur' ? 'rtl' : 'ltr'}>
    <head>
      {/* Cloudflare Web Analytics */}
      <CfAnalytics />
      {/* Geo-location meta tags */}
      <meta name="geo.region" content="CN-SH" />
      <meta name="geo.placename" content="Shanghai" />
      <meta name="ICBM" content="31.2304, 121.4737" />
    </head>
    <body className="min-h-screen flex flex-col pb-16 md:pb-0 antialiased">
      <NextIntlClientProvider messages={messages} locale={validLocale} timeZone="Asia/Shanghai">
        <TradeTranslationProvider messages={messages} locale={validLocale}>
          <OrganizationJsonLd />
          <AuthProvider logoutRedirect={`/${validLocale}/c/login`}>
            <SearchProvider freeCheckHref="/{locale}/c/" loginHref={`/${validLocale}/c/login`} />
            <main className="flex-1">
              <AutoBreadcrumb locale={validLocale} />
              {children}
            </main>
            <Footer />
            <CookieConsent />
            <ActionDock />
          </AuthProvider>
        </TradeTranslationProvider>
      </NextIntlClientProvider>
    </body>
    </html>
  );
}
