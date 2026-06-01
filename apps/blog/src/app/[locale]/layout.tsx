import { Navbar, Footer, TradeTranslationProvider } from '@trade/ui';
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
      <body className="min-h-screen flex flex-col">
        <TradeTranslationProvider messages={messages} locale={locale}>
          <Navbar
            freeCheckHref={`/{locale}/c/`}
          />
          <main className="flex-1">{children}</main>
          <Footer />
        </TradeTranslationProvider>
      </body>
    </html>
  );
}
