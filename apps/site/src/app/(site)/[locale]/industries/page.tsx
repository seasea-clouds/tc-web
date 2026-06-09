import { getTranslations } from 'next-intl/server';
import { locales } from '@/i18n/routing';
import { sharedOpenGraph, sharedTwitter, buildLanguages } from '@trade/ui/seo';
import { industries } from '@/data/industries';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';
import ContactForm from '@/components/ContactForm';
import CTASection from '@/components/CTASection';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'IndustriesCommon' });
  const title = `${t('heroTitle')} | SinoTrade Compliance`;
  const description = t('heroSubtitle');
  const url = `https://sinotradecompliance.com/${locale}/industries/`;
  return {
    title,
    description,
    openGraph: sharedOpenGraph({ title, description, locale, url }),
    twitter: sharedTwitter({ title, description }),
    alternates: {
      canonical: url,
      languages: buildLanguages(locale, [...locales], '/industries/'),
    },
  };
}

export default async function IndustriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const t = await getTranslations({ locale, namespace: 'IndustriesCommon' });
  const bcT = await getTranslations({ locale, namespace: 'breadcrumb' });
  const ctaT = await getTranslations({ locale, namespace: 'CTA' });

  return (
    <div className="min-h-screen bg-bg-snow">
      <Breadcrumb
        locale={locale}
        items={[
          { label: bcT('home'), href: `/${locale}/` },
          { label: bcT('industries') },
        ]}
      />
      {/* Hero */}
      <section className="bg-primary-navy text-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">{t('heroTitle')}</h1>
          <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto">{t('heroSubtitle')}</p>
        </div>
      </section>

      {/* Industry Grid */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-text-charcoal mb-12 text-center">{t('gridTitle')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {industries.map((ind) => (
              <Link
                key={ind.slug}
                href={`/${locale}/industries/${ind.slug}`}
                className="group bg-white rounded-xl shadow-sm hover:shadow-lg border border-gray-100 p-6 transition-all hover:-translate-y-1 flex flex-col items-center text-center"
              >
                <span className="text-5xl mb-4">{ind.emoji}</span>
                <h3 className="text-lg font-semibold text-text-charcoal group-hover:text-primary-navy transition-colors mb-2">
                  {t(`industries.${ind.slug.replace(/-/g, '')}`)}
                </h3>
                <p className="text-sm text-text-grey mb-4">
                  {t(`industries.${ind.slug.replace(/-/g, '')}Desc`)}
                </p>
                <span className="text-primary-navy text-sm font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {t('learnMore')} <ChevronRight className="w-4 h-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-bg-ice py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-text-charcoal mb-4">{t('ctaTitle')}</h2>
          <p className="text-text-grey mb-8">{t('ctaSubtitle')}</p>
          <Link
            href={`/${locale}/quote`}
            className="inline-block bg-accent-blue hover:bg-accent-blue/90 text-white font-semibold px-8 py-3 rounded-lg transition-all hover:shadow-md"
          >
            {t('ctaButton')}
          </Link>
        </div>
      </section>

      <ContactForm />
      <CTASection t={ctaT} />
    </div>
  );
}
