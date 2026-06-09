import { getTranslations } from 'next-intl/server';
import { locales } from '@/i18n/routing';
import { sharedOpenGraph, sharedTwitter, buildLanguages } from '@trade/ui/seo';
import PackageCards from '@/components/PackageCards';
import PackageComparisonTable from '@/components/PackageComparisonTable';
import CTASection from '@/components/CTASection';
import ContactForm from '@/components/ContactForm';
import { WHATSAPP_URL } from '@trade/ui';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'Packages' });
  const title = t('metaTitle') || t('title');
  const description = t('metaDescription') || t('subtitle');
  const url = `https://sinotradecompliance.com/${locale}/packages/`;
  return {
    title,
    description,
    openGraph: sharedOpenGraph({ title, description, locale, url }),
    twitter: sharedTwitter({ title, description }),
    alternates: {
      canonical: url,
      languages: buildLanguages(locale, [...locales], '/packages/'),
    },
  };
}

export default async function PackagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'Packages' });
  const bcT = await getTranslations({ locale, namespace: 'breadcrumb' });
  const ctaT = await getTranslations({ locale, namespace: 'ServiceCommon' });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: t('jsonldName'),
    description: t('jsonldDescription'),
    url: `https://sinotradecompliance.com/${locale}/packages/`,
    publisher: { '@type': 'Organization', name: 'SinoTrade Compliance' },
  };


  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: t('title'),
    description: t('subtitle'),
    url: `https://sinotradecompliance.com/${locale}/packages/`,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: '500',
      highPrice: '10000',
      offerCount: 3,
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      reviewCount: '617',
      bestRating: '5',
    },
    provider: {
      '@type': 'Organization',
      name: 'SinoTrade Compliance',
    },
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      {/* Breadcrumb */}
      {/* Hero */}
      <section className="py-16 bg-primary-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">{t('title')}</h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto">{t('subtitle')}</p>
        </div>
      </section>

      {/* Package Cards */}
      <section className="py-16 bg-bg-ice">
        <PackageCards t={t} locale={locale} />
      </section>

      {/* Comparison Table */}
      <section className="py-16 bg-white">
        <PackageComparisonTable t={t} locale={locale} />
      </section>

      {/* Custom CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-primary-navy mb-4">{t('customTitle')}</h2>
          <p className="text-text-muted mb-6">{t('customDesc')}</p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-primary-navy hover:bg-primary-navy/90 text-white font-semibold px-8 py-3 rounded-md transition-all hover:shadow-lg"
          >
            {t('customCta')}
          </a>
        </div>
      </section>

      <CTASection t={ctaT} />
      <script id="jsonld-packages" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <ContactForm />
    </main>
  );
}
