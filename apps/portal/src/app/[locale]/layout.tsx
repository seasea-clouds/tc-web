import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { locales, defaultLocale } from '@/i18n/routing';
import { messagesMap } from '@/i18n/messages';
import { Footer, SearchProvider, CookieConsent, ActionDock, AuthProvider, TradeTranslationProvider, OrganizationJsonLd, buildAlternates, sharedOpenGraph, sharedTwitter, CfAnalytics } from '@trade/ui';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const validLocale = locales.includes(locale as any) ? locale : defaultLocale;
  const t = await getTranslations({ locale: validLocale, namespace: 'Home' });

  const title = t('metaTitle') || t('title') || t('heroTitle') || 'China Compliance Self-Check | SinoTrade Compliance';
  const description = t('metaDescription') || t('description') || t('heroSubtitle') || 'Check if your product needs GACC registration, CCC certification, or other compliance for the Chinese market.';
  const path = '/c/';
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
      </head>
      <body className="min-h-screen flex flex-col pb-16 md:pb-0 antialiased">
        <NextIntlClientProvider locale={validLocale} messages={messages} timeZone="Asia/Shanghai">
          <TradeTranslationProvider messages={messages} locale={validLocale}>
            <OrganizationJsonLd />
            <AuthProvider logoutRedirect={`/${validLocale}/c/login`}>
              <SearchProvider freeCheckHref="/{locale}/c/" loginHref={`/${validLocale}/c/login`} />
              <main className="flex-1">
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
