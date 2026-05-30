import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { Suspense } from 'react';
import ServiceCheckboxes from '@/components/ServiceCheckboxes';
import Breadcrumb from '@/components/Breadcrumb';
import CTASection from '@/components/CTASection';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const t = await getTranslations({ locale: resolvedParams.locale, namespace: 'Quote' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    openGraph: {
      title: t('ogTitle'),
      description: t('metaDescription'),
    },
  };
}

export default async function QuotePage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const t = await getTranslations({ locale, namespace: 'Quote' });
  const bcT = await getTranslations({ locale, namespace: 'breadcrumb' });
  const ctaT = await getTranslations({ locale, namespace: 'CTA' });

  return (
    <main className="min-h-screen bg-[#F4F6F9]">
      <Breadcrumb
        locale={locale}
        items={[
          { label: bcT('home'), href: `/${locale}/` },
          { label: t('heroTitle') },
        ]}
      />

      {/* Hero */}
      <section className="bg-primary-navy text-white py-16 sm:py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">{t('heroTitle')}</h1>
          <p className="text-lg sm:text-xl text-white/80 leading-relaxed">{t('heroSubtitle')}</p>
        </div>
      </section>

      {/* Quote Form */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <form
            action="https://api.web3forms.com/submit"
            method="POST"
            className="bg-white rounded-xl shadow-lg p-6 sm:p-10"
          >
            <input type="hidden" name="access_key" value="b1e6d34d-9fdc-4dc1-9bb2-6fc9090b361c" />
            <input type="hidden" name="from_name" value="SinoTrade Quote Form" />
            <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} />
            <input type="hidden" name="redirect" value={`https://sinotradecompliance.com/${resolvedParams.locale}/thank-you`} />

            {/* Service Selector */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-[#333333] mb-3">{t('serviceLabel')}</label>
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

            {/* Email */}
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-semibold text-[#333333] mb-1">
                {t('emailLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                id="email"
                placeholder={t('emailPlaceholder')}
                required
                className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1B365D] focus:border-transparent transition-all shadow-sm text-[#333333]"
              />
            </div>

            {/* Message */}
            <div className="mb-6">
              <label htmlFor="message" className="block text-sm font-semibold text-[#333333] mb-1">
                {t('messageLabel')} <span className="text-red-500">*</span>
              </label>
              <textarea
                name="message"
                id="message"
                rows={4}
                placeholder={t('messagePlaceholder')}
                required
                className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1B365D] focus:border-transparent transition-all shadow-sm text-[#333333] resize-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-[#1B365D] hover:bg-[#1B365D]/90 text-white font-bold py-3.5 px-4 rounded-md transition-colors duration-300 shadow-md flex justify-center items-center gap-2"
            >
              {t('button')}
            </button>

            <p className="text-xs text-[#5F6F7F] text-center mt-3">{t('privacy')}</p>
          </form>
        </div>
      </section>

      <CTASection t={ctaT} />
    </main>
  );
}
