import { NextIntlClientProvider } from 'next-intl';
import { locales, defaultLocale } from '@/i18n/routing';
import { messagesMap } from '@/i18n/messages';
import { TradeTranslationProvider } from '@trade/ui';
import Header from "@/components/LayoutHeader";
import { Footer } from '@trade/ui';
import { AuthProvider } from "@/components/AuthProvider";
import CookieConsent from "@/components/CookieConsent";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
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
    <NextIntlClientProvider locale={validLocale} messages={messages} timeZone="UTC">
      <TradeTranslationProvider messages={messages} locale={validLocale}>
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <CookieConsent />
        </AuthProvider>
      </TradeTranslationProvider>
    </NextIntlClientProvider>
  );
}
