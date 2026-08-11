import { locales, defaultLocale } from '@/i18n/routing';
import { buildAlternates } from '@trade/ui';
import ReportClient from './report-client';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const validLocale = locales.includes(locale as any) ? locale : defaultLocale;
  const path = '/c/report/';
  const alternates = buildAlternates(validLocale, [...locales], path);

  return {
    title: 'Compliance Report | SinoTrade Compliance',
    description: 'Your China compliance check report',
    robots: { index: false, follow: false },
    alternates,
  };
}

export default function Page() {
  return <ReportClient />;
}
