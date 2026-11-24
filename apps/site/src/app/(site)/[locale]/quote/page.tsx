import { getTranslations } from 'next-intl/server';
import { locales } from '@/i18n/routing';
import { sharedOpenGraph, sharedTwitter, buildLanguages } from '@trade/ui/seo';
import { ComplianceForm } from '@trade/ui';
import { Suspense } from 'react';
import ServiceCheckboxes from '@/components/ServiceCheckboxes';
import CTASection from '@/components/CTASection';
import PortalCTASection from '@/components/PortalCTASection';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'Quote' });
  const title = t('metaTitle');
  const description = t('metaDescription');
  const url = `https://sinotradecompliance.com/${locale}/quote/`;
  return {
    title,
    description,
    openGraph: sharedOpenGraph({ title, description, locale, url }),
    twitter: sharedTwitter({ title, description }),
    alternates: {
      canonical: url,
      languages: buildLanguages(locale, [...locales], '/quote/'),
    },
  };
}

export default async function QuotePage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const t = await getTranslations({ locale, namespace: 'Quote' });
  const bcT = await getTranslations({ locale, namespace: 'breadcrumb' });
  const ctaT = await getTranslations({ locale, namespace: 'CTA' });
  const commonT = await getTranslations({ locale, namespace: 'ServiceCommon' });
  const cf = await getTranslations({ locale, namespace: 'ContactForm' });

  return (
    <div className="bg-[#F4F6F9]">
      {/* Hero */}
      <section className="bg-primary-navy text-white py-16 sm:py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">{t('heroTitle')}</h1>
          <p className="text-lg sm:text-xl text-white/80 leading-relaxed">{t('heroSubtitle')}</p>
        </div>
      </section>

      {/* Quote Form —— 用全站的 ComplianceForm（唯一一份表单代码）：
          children 放服务多选，来源标识字段因此与其它页面完全一致 */}
      <ComplianceForm
        locale={locale}
        source="quote"
        pageTitle="报价单"
        fromName="SinoTrade Quote Form"
        idPrefix="quote"
        maxWidth="max-w-2xl"
        texts={{
          title: cf('title'),
          subtitle: cf('subtitle'),
          emailLabel: t('emailLabel'),
          emailPlaceholder: t('emailPlaceholder'),
          messageLabel: t('messageLabel'),
          messagePlaceholder: t('messagePlaceholder'),
          button: t('button'),
          privacy: t('privacy'),
        }}
      >
        <div className="mb-6 text-left">
          <label className="mb-3 block text-sm font-semibold text-[#333333]">{t('serviceLabel')}</label>
          <Suspense>
            <ServiceCheckboxes
              labels={[
                { id: 'gacc', icon: '📋', label: t('services.gacc') },
                { id: 'label', icon: '🏷️', label: t('services.label') },
                { id: 'ccc', icon: '🔌', label: t('services.ccc') },
                { id: 'cosmetics', icon: '💄', label: t('services.cosmetics') },
                { id: 'ecommerce', icon: '🛒', label: t('services.ecommerce') },
                { id: 'brand', icon: '🛡️', label: t('services.brand') },
              ]}
            />
          </Suspense>
        </div>
      </ComplianceForm>

      <PortalCTASection t={commonT} href={`/${locale}/c/`} generic />
      <CTASection t={ctaT} />
    </div>
  );
}
