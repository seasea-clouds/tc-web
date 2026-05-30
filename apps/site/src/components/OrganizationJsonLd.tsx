import { getTranslations } from 'next-intl/server';
import { splitByComma } from '@/lib/utils';

/**
 * JSON-LD structured data for Organization.
 * Added to every page for SEO.
 * Uses plain <script> tag — next/script does NOT render JSON-LD
 * inline in App Router (serializes to RSC payload instead).
 */
export default async function OrganizationJsonLd({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'OrganizationJsonLd' });
  const availableLangs = splitByComma(t('availableLanguage'));

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SinoTrade Compliance',
    description: t('description'),
    url: 'https://sinotradecompliance.com',
    logo: 'https://sinotradecompliance.com/logo.png',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'david@sinotradecompliance.com',
      contactType: t('contactType'),
      availableLanguage: availableLangs,
    },
    sameAs: JSON.parse(t.raw('sameAs')),
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Shanghai',
      addressRegion: 'Jing\'an District',
      addressCountry: 'CN',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
