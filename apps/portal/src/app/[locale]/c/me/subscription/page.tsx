import { locales, defaultLocale } from '@/i18n/routing';
import { buildAlternates } from '@trade/ui';
import SubscriptionClient from './subscription-client';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const validLocale = locales.includes(locale as any) ? locale : defaultLocale;
  const path = '/c/me/subscription/';
  const alternates = buildAlternates(validLocale, [...locales], path);

  return {
    title: 'Subscription | SinoTrade Compliance',
    description: 'Manage your SinoTrade Compliance subscription and billing',
    robots: { index: false, follow: false },
    alternates,
  };
}

export default function Page() {
  return <SubscriptionClient />;
}
