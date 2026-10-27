import { locales, defaultLocale } from '@/i18n/routing';
import { buildAlternates } from '@trade/ui';
import RootRedirectClient from './root-redirect-client';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const validLocale = locales.includes(locale as any) ? locale : defaultLocale;
  const path = '/';
  const alternates = buildAlternates(validLocale, [...locales], path);

  return {
    title: 'China Regulations & GACC Decrees | SinoTrade Compliance',
    description: 'Expert guides on exporting your products to China',
    robots: { index: false, follow: true },
    alternates,
  };
}

export default function Page() {
  return <RootRedirectClient />;
}
