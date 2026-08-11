import { locales, defaultLocale } from '@/i18n/routing';
import { buildAlternates } from '@trade/ui';
import MeClient from './me-client';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const validLocale = locales.includes(locale as any) ? locale : defaultLocale;
  const path = '/c/me/';
  const alternates = buildAlternates(validLocale, [...locales], path);

  return {
    title: 'My Account | SinoTrade Compliance',
    description: 'Manage your SinoTrade Compliance account',
    robots: { index: false, follow: false },
    alternates,
  };
}

export default function Page() {
  return <MeClient />;
}
