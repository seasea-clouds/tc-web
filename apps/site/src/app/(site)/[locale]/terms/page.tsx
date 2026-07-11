import { getTranslations } from 'next-intl/server';
import { locales } from '@/i18n/routing';
import { sharedOpenGraph, sharedTwitter, buildLanguages } from '@trade/ui/seo';
import CTASection from '@/components/CTASection';
import PortalCTASection from '@/components/PortalCTASection';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'Terms' });
  const title = t('metaTitle');
  const description = t('metaDescription');
  const url = `https://sinotradecompliance.com/${locale}/terms/`;
  return {
    title,
    description,
    openGraph: sharedOpenGraph({ title, description, locale, url }),
    twitter: sharedTwitter({ title, description }),
    alternates: {
      canonical: url,
      languages: buildLanguages(locale, [...locales], '/terms/'),
    },
  };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'Terms' });
  const ctaT = await getTranslations({ locale, namespace: 'CTA' });
  const commonT = await getTranslations({ locale, namespace: 'ServiceCommon' });

  return (
    <div className="bg-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-primary-navy mt-6 mb-8">{t('title')}</h1>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-primary-navy mt-8 mb-3">{t('acceptanceTitle')}</h2>
            <p className="text-gray-600 leading-relaxed">{t('acceptanceText1')}</p>
            <p className="text-gray-600 leading-relaxed mt-3">{t('acceptanceText2')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary-navy mt-8 mb-3">{t('serviceTitle')}</h2>
            <p className="text-gray-600 leading-relaxed">{t('serviceText1')}</p>
            <p className="text-gray-600 leading-relaxed mt-3">{t('serviceText2')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary-navy mt-8 mb-3">{t('accountTitle')}</h2>
            <p className="text-gray-600 leading-relaxed">{t('accountText1')}</p>
            <p className="text-gray-600 leading-relaxed mt-3">{t('accountText2')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary-navy mt-8 mb-3">{t('paymentTitle')}</h2>
            <p className="text-gray-600 leading-relaxed">{t('paymentText1')}</p>
            <p className="text-gray-600 leading-relaxed mt-3">{t('paymentText2')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary-navy mt-8 mb-3">{t('intellectualTitle')}</h2>
            <p className="text-gray-600 leading-relaxed">{t('intellectualText1')}</p>
            <p className="text-gray-600 leading-relaxed mt-3">{t('intellectualText2')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary-navy mt-8 mb-3">{t('limitationTitle')}</h2>
            <p className="text-gray-600 leading-relaxed">{t('limitationText')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary-navy mt-8 mb-3">{t('terminationTitle')}</h2>
            <p className="text-gray-600 leading-relaxed">{t('terminationText')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary-navy mt-8 mb-3">{t('changesTitle')}</h2>
            <p className="text-gray-600 leading-relaxed">{t('changesText')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary-navy mt-8 mb-3">{t('governingTitle')}</h2>
            <p className="text-gray-600 leading-relaxed">{t('governingText')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary-navy mt-8 mb-3">{t('contactTitle')}</h2>
            <p className="text-gray-600 leading-relaxed">{t('contactText')}</p>
            <p className="text-gray-600 leading-relaxed mt-2">
              Email: <a href="mailto:david@sinotradecompliance.com" className="text-gold hover:underline">david@sinotradecompliance.com</a>
            </p>
          </section>
        </div>
      </div>
      <PortalCTASection t={commonT} href={`/${locale}/c/`} generic />
      <CTASection t={ctaT} />
    </div>
  );
}
