import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Footer, SearchProvider, CookieConsent, ActionDock, TradeTranslationProvider, OrganizationJsonLd, buildAlternates, sharedOpenGraph, sharedTwitter, AuthProvider, CfAnalytics } from '@trade/ui';
import { getMessages } from '@/lib/messages';
import { locales, defaultLocale } from '@/i18n/routing';
import '../globals.css';

export async function generateStaticParams() {
  return locales.map(l => ({ locale: l }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Blog' });

  const title = t('metaTitle') || t('title') || 'China Import Compliance Blog | SinoTrade Compliance';
  const description = t('metaDescription') || t('subtitle') || 'Expert guides on China import compliance. GACC registration, CCC certification, NMPA cosmetics filing, and cross-border e-commerce.';
  const path = '/blog/';
  const alternates = buildAlternates(locale, [...locales], path);

  return {
    title,
    description,
    alternates,
    openGraph: sharedOpenGraph({ title, description, locale, url: alternates.canonical }),
    twitter: sharedTwitter({ title, description }),
  };
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = getMessages(locale);

  return (
    <html lang={locale}>
      <head>
        {/* Cloudflare Web Analytics */}
        <CfAnalytics />
      </head>
      <body className="min-h-screen flex flex-col pb-16 md:pb-0 antialiased">
        <NextIntlClientProvider messages={messages} locale={locale} timeZone="Asia/Shanghai">
          <TradeTranslationProvider messages={messages} locale={locale}>
            <OrganizationJsonLd />
          <AuthProvider logoutRedirect={`/${locale}/c/login`}>
            <SearchProvider freeCheckHref="/{locale}/c/" loginHref={`/${locale}/c/login`} />
            <main className="flex-1">{children}</main>
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
