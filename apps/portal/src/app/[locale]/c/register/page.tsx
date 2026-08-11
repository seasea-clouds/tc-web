import { getTranslations } from 'next-intl/server';
import { locales, defaultLocale } from '@/i18n/routing';
import { buildAlternates, sharedOpenGraph, sharedTwitter } from '@trade/ui';
import RegisterClient from './register-client';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const validLocale = locales.includes(locale as any) ? locale : defaultLocale;
  const t = await getTranslations({ locale: validLocale, namespace: 'Auth' });

  const title = `${t('registerTitle')} | SinoTrade Compliance`;
  const description = t('registerDesc') || 'Create a free SinoTrade Compliance account to run compliance checks and save your reports.';
  const path = '/c/register/';
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
  return <RegisterClient />;
}
