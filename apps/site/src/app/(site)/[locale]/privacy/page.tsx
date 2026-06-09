import { getTranslations } from 'next-intl/server';
import { locales } from '@/i18n/routing';
import { sharedOpenGraph, sharedTwitter, buildLanguages } from '@trade/ui/seo';
import CTASection from '@/components/CTASection';
import Breadcrumb from '@/components/Breadcrumb';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'Privacy' });
  const title = t('metaTitle');
  const description = t('metaDescription');
  const url = `https://sinotradecompliance.com/${locale}/privacy/`;
  return {
    title,
    description,
    openGraph: sharedOpenGraph({ title, description, locale, url }),
    twitter: sharedTwitter({ title, description }),
    alternates: {
      canonical: url,
      languages: buildLanguages(locale, [...locales], '/privacy/'),
    },
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'Privacy' });
  const ctaT = await getTranslations({ locale, namespace: 'CTA' });

  return (
    <div className="bg-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Breadcrumb
          locale={locale}
          items={[
            { label: 'Home', href: '/' },
            { label: t('title'), href: '/privacy/' },
          ]}
        />
        <h1 className="text-3xl font-bold text-primary-navy mt-6 mb-8">{t('title')}</h1>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-primary-navy mt-8 mb-3">{t('infoTitle')}</h2>
            <p className="text-gray-600 leading-relaxed">{t('infoText1')}</p>
            <p className="text-gray-600 leading-relaxed mt-3">{t('infoText2')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary-navy mt-8 mb-3">{t('cookieTitle')}</h2>
            <p className="text-gray-600 leading-relaxed">{t('cookieText1')}</p>
            <p className="text-gray-600 leading-relaxed mt-3">{t('cookieText2')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary-navy mt-8 mb-3">{t('contactTitle')}</h2>
            <p className="text-gray-600 leading-relaxed">{t('contactText')}</p>
            <p className="text-gray-600 leading-relaxed mt-2">
              Email: <a href="mailto:david@sinotradecompliance.com" className="text-gold hover:underline">david@sinotradecompliance.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary-navy mt-8 mb-3">{t('updateTitle')}</h2>
            <p className="text-gray-600 leading-relaxed">{t('updateText')}</p>
          </section>
        </div>
      </div>
      <CTASection t={ctaT} />
    </div>
  );
}
