import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Footer, SearchProvider, CookieConsent, ActionDock, TradeTranslationProvider, OrganizationJsonLd, sharedOpenGraph, sharedTwitter, AuthProvider, CfAnalytics, AutoBreadcrumb, buildAlternates } from '@trade/ui';
import { getMessages } from '@/lib/messages';
import { locales, defaultLocale } from '@/i18n/routing';
import '../globals.css';

export async function generateStaticParams() {
  return locales.map(l => ({ locale: l }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const validLocale = locales.includes(locale as any) ? locale : defaultLocale;

  const t = await getTranslations({ locale: validLocale, namespace: 'Blog' });

  const title = t('metaTitle') || 'China Import Compliance';
  const description = t('metaDescription') || 'China import compliance guides: GACC registration, CCC certification, NMPA cosmetics filing, and cross-border e-commerce.';
  const alternates = buildAlternates(validLocale, [...locales], '');
  return {
    title,
    description,
    alternates,
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
  const validLocale = locales.includes(locale as any) ? locale : defaultLocale;
  const messages = getMessages(validLocale);

  return (
    <html lang={validLocale} dir={validLocale === 'ar' || validLocale === 'he' || validLocale === 'fa' || validLocale === 'ur' ? 'rtl' : 'ltr'}>
      <head>
        {/* Cloudflare Web Analytics */}
        <CfAnalytics />
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
