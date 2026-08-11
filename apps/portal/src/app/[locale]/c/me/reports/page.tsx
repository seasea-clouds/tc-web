import { locales, defaultLocale } from '@/i18n/routing';
import { buildAlternates } from '@trade/ui';
import ReportsClient from './reports-client';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const validLocale = locales.includes(locale as any) ? locale : defaultLocale;
  const path = '/c/me/reports/';
  const alternates = buildAlternates(validLocale, [...locales], path);

  return {
    title: 'My Reports | SinoTrade Compliance',
    description: 'View your saved compliance check reports',
    robots: { index: false, follow: false },
    alternates,
  };
}

export default function Page() {
  return <ReportsClient />;
}
