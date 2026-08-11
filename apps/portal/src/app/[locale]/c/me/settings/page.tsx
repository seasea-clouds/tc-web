import { locales, defaultLocale } from '@/i18n/routing';
import { buildAlternates } from '@trade/ui';
import SettingsClient from './settings-client';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const validLocale = locales.includes(locale as any) ? locale : defaultLocale;
  const path = '/c/me/settings/';
  const alternates = buildAlternates(validLocale, [...locales], path);

  return {
    title: 'Account Settings | SinoTrade Compliance',
    description: 'Manage your SinoTrade Compliance account settings',
    robots: { index: false, follow: false },
    alternates,
  };
}

export default function Page() {
  return <SettingsClient />;
}
