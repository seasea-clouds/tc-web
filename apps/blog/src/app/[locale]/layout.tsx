import { NextIntlClientProvider } from 'next-intl';
import { Footer, SearchProvider, ActionDock, TradeTranslationProvider, OrganizationJsonLd } from '@trade/ui';
import { getMessages } from '@/lib/messages';
import '../globals.css';

const LOCALES = [
  'en','zh','es','fr','de','ja','pt','ru','ar','ko','it','nl','tr','vi','id','th',
  'hi','pl','sv','el','cs','ro','hu','fi','da','no','uk','bg','hr','sr','sk',
  'sl','ms','ka','he','sw','bn','ca','fa','ur','ta','af','sq','az','hy','be','ne','si',
];

export async function generateStaticParams() {
  return LOCALES.map(l => ({ locale: l }));
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
