import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { locales } from '@/i18n/routing';
import { industryBySlug, industries } from '@/data/industries';
import { sharedOpenGraph, sharedTwitter, buildLanguages } from '@trade/ui/seo';
import Hero from '@/components/Hero';
import { WHATSAPP_URL } from '@/lib/constants';
import CoverSection from '@/components/CoverSection';
import ProcessSteps from '@/components/ProcessSteps';
import WhyUsCards from '@/components/WhyUsCards';
import ServiceFAQ from '@/components/ServiceFAQ';
import ContactForm from '@/components/ContactForm';
import CTASection from '@/components/CTASection';
import HowToJsonLd from '@/components/HowToJsonLd';
import Breadcrumb from '@/components/Breadcrumb';

export function generateStaticParams() {
  const params: Array<{ locale: string; industry: string }> = [];
  for (const locale of locales) {
    for (const industry of industries) {
      params.push({ locale, industry: industry.slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; industry: string }>;
}) {
  const { locale, industry: industrySlug } = await params;
  const industry = industryBySlug(industrySlug);
  if (!industry) return { title: 'Not Found' };

  const t = await getTranslations({ locale, namespace: industry.namespace });
  // Use metaTitle/metaDescription when available, fall back to heroTitle/heroSubtitle
  const rawTitle = t('metaTitle');
  const title = rawTitle && !rawTitle.includes('.') ? rawTitle : t('heroTitle');
  const rawDesc = t('metaDescription');
  const description = rawDesc && !rawDesc.includes('.') ? rawDesc : t('heroSubtitle');
  const url = `https://sinotradecompliance.com/${locale}/industries/${industrySlug}/`;

  return {
    title,
    description,
    openGraph: sharedOpenGraph({ title, description, locale, url }),
    twitter: sharedTwitter({ title, description }),
    alternates: {
      canonical: url,
      languages: buildLanguages(locale, [...locales], `/industries/${industrySlug}/`),
    },
  };
}

export default async function IndustryPage({
  params,
}: {
  params: Promise<{ locale: string; industry: string }>;
}) {
  const { locale, industry: industrySlug } = await params;
  const industry = industryBySlug(industrySlug);
  if (!industry) notFound();

  const t = await getTranslations({ locale, namespace: industry.namespace });
  const bcT = await getTranslations({ locale, namespace: 'breadcrumb' });
  const homeT = await getTranslations({ locale, namespace: 'Home' });
  const commonT = await getTranslations({ locale, namespace: 'ServiceCommon' });
  const url = `https://sinotradecompliance.com/${locale}/industries/${industrySlug}/`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: t('heroTitle'),
    description: t('heroSubtitle'),
    url,
    provider: { '@type': 'Organization', name: 'SinoTrade Compliance' },
    serviceType: 'China Import Compliance Consulting',
    areaServed: 'Worldwide',
  };

  return (
    <main>
      <Breadcrumb
        locale={locale}
        items={[
          { label: bcT('home'), href: `/${locale}/` },
          { label: bcT('industries'), href: `/${locale}/industries` },
          { label: t('heroTitle') },
        ]}
      />
      <HowToJsonLd locale={locale} namespace={industry.namespace} url={url} />
      <Hero
        title={t('heroTitle')}
        subtitle={t('heroSubtitle')}
        ctas={[{ text: t('cta'), href: WHATSAPP_URL, variant: 'primary' }]}
      />
      <CoverSection t={t} />
      <ProcessSteps t={homeT} />
      <WhyUsCards count={4} t={commonT} />
      <ServiceFAQ namespace={industry.namespace} services={industry.services} />
      <ContactForm />
      <CTASection t={commonT} />
      <script
        id={`jsonld-industry-${industrySlug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
