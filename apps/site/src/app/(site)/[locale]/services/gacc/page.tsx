import { getTranslations } from 'next-intl/server';
import { locales } from '@/i18n/routing';
import { sharedOpenGraph, sharedTwitter } from '@trade/ui/seo';
import Hero from '@/components/Hero';
import { WHATSAPP_URL } from '@/lib/constants';
import CoverSection from '@/components/CoverSection';
import ProcessSteps from '@/components/ProcessSteps';
import WhyUsCards from '@/components/WhyUsCards';
import CTASection from '@/components/CTASection';
import ContactForm from '@/components/ContactForm';
import ServiceFAQ from '@/components/ServiceFAQ';
import HowToJsonLd from '@/components/HowToJsonLd';
import DefinitionSchema from '@/components/DefinitionSchema';
import QuickAnswer from '@/components/QuickAnswer';
import Breadcrumb from '@/components/Breadcrumb';
import RelatedResources from '@/components/RelatedResources';
import { getBlogCategoryForService } from '@/lib/service-blog-map';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'ServiceGacc' });
  const title = t('metaTitle') || t('heroTitle');
  const description = t('metaDescription') || t('heroSubtitle');
  const url = `https://sinotradecompliance.com/${locale}/services/gacc/`;
  return {
    title,
    description,
    openGraph: sharedOpenGraph({ title, description, locale, url }),
    twitter: sharedTwitter({ title, description }),
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        locales.map((l) => [l, `https://sinotradecompliance.com/${l}/services/gacc/`])
      ),
    },
  };
}

export default async function GaccPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'ServiceGacc' });
  const bcT = await getTranslations({ locale, namespace: 'breadcrumb' });
  const url = `https://sinotradecompliance.com/${locale}/services/gacc/`;
  const commonT = await getTranslations({ locale, namespace: 'ServiceCommon' });
  const ctaT = await getTranslations({ locale, namespace: 'CTA' });

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: t('jsonldName'),
    description: t('jsonldDescription'),
    url: `https://sinotradecompliance.com/${locale}/services/gacc/`,
    provider: { '@type': 'Organization', name: 'SinoTrade Compliance' },
    serviceType: t('jsonldServiceType'),
    areaServed: 'Worldwide',
  };

  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': ['ProfessionalService', 'LocalBusiness'],
    name: 'SinoTrade Compliance',
    description: t('jsonldDescription'),
    url: `https://sinotradecompliance.com/${locale}/services/gacc/`,
    telephone: '+1 (555) 000-0000',
    areaServed: 'Worldwide',
    priceRange: '$$',
  };



  const homeT = await getTranslations({ locale, namespace: 'Home' });


  const definitionTerms = [    { nameKey: "gaccName", definitionKey: "gaccDefinition" },
    { nameKey: "decree248Name", definitionKey: "decree248Definition" },
    { nameKey: "ciferName", definitionKey: "ciferDefinition" },
    { nameKey: "samrName", definitionKey: "samrDefinition" },
  ];

  return (
    <main>
      <Breadcrumb
        locale={locale}
        items={[
          { label: bcT('home'), href: `/${locale}/` },
          { label: bcT('services'), href: `/${locale}/services` },
          { label: t('heroTitle') },
        ]}
      />
      <DefinitionSchema locale={locale} terms={definitionTerms} />
      <HowToJsonLd locale={locale} namespace="ServiceGacc" url={url} />
      <Hero
        title={t('heroTitle')}
        subtitle={t('heroSubtitle')}
        ctas={[{ text: t('cta'), href: WHATSAPP_URL, variant: 'primary' }]}
      />
      <QuickAnswer locale={locale} namespace="ServiceGacc" />
      <CoverSection t={t} />
      <ProcessSteps t={homeT} />
      <WhyUsCards t={commonT} />
      <ServiceFAQ namespace="ServiceGacc" />
      <RelatedResources locale={locale} category={getBlogCategoryForService('gacc', locale)} />
      <ContactForm />
      <CTASection t={ctaT} />
          <script id="jsonld-gacc" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
          <script id="jsonld-local-gacc" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }} />
    </main>
  );
}
