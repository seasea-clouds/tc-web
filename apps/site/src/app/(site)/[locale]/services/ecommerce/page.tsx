import { getTranslations } from 'next-intl/server';
import { locales } from '@/i18n/routing';
import { sharedOpenGraph, sharedTwitter, buildLanguages } from '@trade/ui/seo';
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
  const t = await getTranslations({ locale, namespace: 'ServiceEcommerce' });
  const title = t('metaTitle') || t('heroTitle');
  const description = t('metaDescription') || t('heroSubtitle');
  const url = `https://sinotradecompliance.com/${locale}/services/ecommerce/`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: buildLanguages(locale, [...locales], '/services/ecommerce/'),
    },
  };
}

export default async function EcommercePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'ServiceEcommerce' });
  const bcT = await getTranslations({ locale, namespace: 'breadcrumb' });
  const url = `https://sinotradecompliance.com/${locale}/services/ecommerce/`;
  const commonT = await getTranslations({ locale, namespace: 'ServiceCommon' });
  const ctaT = await getTranslations({ locale, namespace: 'CTA' });

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    url: `https://sinotradecompliance.com/${locale}/services/ecommerce/`,
    provider: { '@type': 'Organization', name: 'SinoTrade Compliance' },
    areaServed: 'Worldwide',
  };

  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': ['ProfessionalService', 'LocalBusiness'],
    name: 'SinoTrade Compliance',
    url: `https://sinotradecompliance.com/${locale}/services/ecommerce/`,
    telephone: '+1 (555) 000-0000',
    areaServed: 'Worldwide',
    priceRange: '$$',
  };



  const homeT = await getTranslations({ locale, namespace: 'Home' });


  const definitionTerms = [    { nameKey: "cbecName", definitionKey: "cbecDefinition" },
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
      <HowToJsonLd locale={locale} namespace="ServiceEcommerce" url={url} />
      <Hero
        title={t('heroTitle')}
        subtitle={t('heroSubtitle')}
        ctas={[{ text: t('cta'), href: WHATSAPP_URL, variant: 'primary' }]}
      />
      <QuickAnswer locale={locale} namespace="ServiceEcommerce" />
      <CoverSection t={t} />
      <ProcessSteps t={homeT} />
      <WhyUsCards t={commonT} />
      <ServiceFAQ namespace="ServiceEcommerce" />
      <RelatedResources locale={locale} category={getBlogCategoryForService('ecommerce', locale)} />
      <ContactForm />
      <CTASection t={ctaT} />
          <script id="jsonld-ecommerce" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
          <script id="jsonld-local-ecommerce" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }} />
    </main>
  );
}
