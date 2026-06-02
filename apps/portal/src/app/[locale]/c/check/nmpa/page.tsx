import { getTranslations } from 'next-intl/server';
import { locales, defaultLocale } from '@/i18n/routing';
import { buildAlternates, sharedOpenGraph, sharedTwitter } from '@trade/ui';
import NmpaCheckClient from './check-client';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const validLocale = locales.includes(locale as any) ? locale : defaultLocale;
  const t = await getTranslations({ locale: validLocale, namespace: 'Check' });

  const title = t('nmpaMetaTitle') || 'NMPA Check | SinoTrade Compliance';
  const description = t('nmpaMetaDescription') || 'Free compliance check for China import requirements.';
  const path = '/c/check/nmpa/';
  const alternates = buildAlternates(validLocale, [...locales], path);

  return {
    title,
    description,
    alternates,
    openGraph: sharedOpenGraph({ title, description, locale: validLocale, url: alternates.canonical }),
    twitter: sharedTwitter({ title, description }),
  };
}

export default function Page() {
  return <NmpaCheckClient />;
}
