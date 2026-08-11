import { locales, defaultLocale } from '@/i18n/routing';
import { buildAlternates } from '@trade/ui';
import PreviewClient from './preview-client';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const validLocale = locales.includes(locale as any) ? locale : defaultLocale;
  const path = '/c/report/preview/';
  const alternates = buildAlternates(validLocale, [...locales], path);

  return {
    title: 'Report Preview | SinoTrade Compliance',
    description: 'Preview your China compliance check report',
    robots: { index: false, follow: false },
    alternates,
  };
}

export default function Page() {
  return <PreviewClient />;
}
