import { getTranslations } from 'next-intl/server';
import { locales } from '@/i18n/routing';
import { sharedOpenGraph, sharedTwitter } from '@/lib/metadata';
import ServicesGrid from '@/components/ServicesGrid';
import CTASection from '@/components/CTASection';
import ContactForm from '@/components/ContactForm';
import Breadcrumb from '@/components/Breadcrumb';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'Services' });
  const title = t('metaTitle') || t('heroTitle');
  const description = t('metaDescription') || t('heroSubtitle');
  const url = `https://sinotradecompliance.com/${locale}/services/`;
  return {
    title,
    description,
    openGraph: sharedOpenGraph({ title, description, locale, url }),
    twitter: sharedTwitter({ title, description }),
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        locales.map((l) => [l, `https://sinotradecompliance.com/${l}/services/`])
      ),
    },
  };
}

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'Services' });
  const bcT = await getTranslations({ locale, namespace: 'breadcrumb' });
  const ctaT = await getTranslations({ locale, namespace: 'CTA' });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t('jsonldName'),
    description: t('jsonldDescription'),
    url: `https://sinotradecompliance.com/${locale}/services/`,
    publisher: { '@type': 'Organization', name: 'SinoTrade Compliance' },
  };

  return (
    <main>
      <Breadcrumb
        locale={locale}
        items={[
          { label: bcT('home'), href: `/${locale}/` },
          { label: bcT('services') },
        ]}
      />
      <ServicesGrid headingLevel="h1" />
      <ContactForm />
      <CTASection t={ctaT} />
      <script id="jsonld-services" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
