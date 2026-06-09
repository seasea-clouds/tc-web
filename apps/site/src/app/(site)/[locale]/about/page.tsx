import { getTranslations } from 'next-intl/server';
import { getNumberedItems, splitByComma } from '@/lib/utils';
import { locales } from '@/i18n/routing';
import { sharedOpenGraph, sharedTwitter } from '@trade/ui/seo';
import ContactForm from '@/components/ContactForm';
import { WHATSAPP_URL } from '@trade/ui';
import CTASection from '@/components/CTASection';
import Breadcrumb from '@/components/Breadcrumb';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'About' });
  const title = t('metaTitle') || t('title');
  const description = t('metaDescription') || t('subtitle');
  const url = `https://sinotradecompliance.com/${locale}/about/`;
  return {
    title,
    description,
    openGraph: sharedOpenGraph({ title, description, locale, url }),
    twitter: sharedTwitter({ title, description }),
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        locales.map((l) => [l, `https://sinotradecompliance.com/${l}/about/`])
      ),
    },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'About' });
  const bcT = await getTranslations({ locale, namespace: 'breadcrumb' });
  const ctaT = await getTranslations({ locale, namespace: 'CTA' });

  // JSON-LD
  const knowsAbout = splitByComma(t('jsonldKnowsAbout'));
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: t('jsonldName'),
    description: t('jsonldDescription'),
    url: `https://sinotradecompliance.com/${locale}/about/`,
    publisher: { '@type': 'Organization', name: 'SinoTrade Compliance' },
    mainEntity: {
      '@type': 'Person',
      name: 'David Zhang',
      jobTitle: t('jsonldJobTitle'),
      knowsAbout: knowsAbout,
    },
  };

  return (
    <main>
      <Breadcrumb
        locale={locale}
        items={[
          { label: bcT('home'), href: `/${locale}/` },
          { label: t('title') },
        ]}
      />

      {/* Hero */}
      <section className="py-16 bg-primary-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">{t('title')}</h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto">{t('subtitle')}</p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-navy mb-6 text-center">{t('missionTitle')}</h2>
          <p className="text-text-charcoal text-lg leading-relaxed text-center">{t('missionText')}</p>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-bg-ice">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-navy mb-10 text-center">{t('valuesTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {getNumberedItems(t, 'values').map((v, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 text-center">
                <h3 className="text-lg font-bold text-primary-navy mb-2">{v}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-navy mb-10 text-center">{t('teamTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {[1, 2, 3, 4].map((n) => {
              const name = t.raw(`teamMember${n}Name`);
              const role = t.raw(`teamMember${n}Role`);
              const desc = t.raw(`teamMember${n}Desc`);
              if (!name || !role) return null;
              // Index-based avatar mapping (locale-independent)
              const avatarPaths = ['/images/david-zhang.webp', '/images/sarah-chen.webp', '/images/mike-wang.webp', '/images/leo-liu.webp'];
              const avatar = avatarPaths[n - 1];
              return (
                <div key={n} className="bg-bg-ice rounded-lg shadow-md p-6 text-center">
                  {avatar ? (
                    <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 bg-[#F4F6F9]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={avatar} alt={String(name)} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary-navy/10 mx-auto mb-4 flex items-center justify-center text-3xl">👤</div>
                  )}
                  <h3 className="text-lg font-bold text-primary-navy mb-1">{String(name)}</h3>
                  <p className="text-accent-gold text-sm font-semibold mb-2">{String(role)}</p>
                  <p className="text-text-muted text-sm">{String(desc || '')}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="py-16 bg-bg-ice">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-navy mb-3">{t('partnersTitle')}</h2>
          <p className="text-text-muted mb-8">{t('partnersSubtitle')}</p>
          <div className="flex flex-wrap justify-center gap-8">
            {getNumberedItems(t, 'partners').map((p, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm px-6 py-4 text-sm font-semibold text-primary-navy">{p}</div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary-navy">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">{t('ctaTitle')}</h2>
          <p className="text-white/80 mb-8">{t('ctaSubtitle')}</p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-accent-gold hover:bg-accent-gold/90 text-white font-semibold px-8 py-3 rounded-md transition-all hover:shadow-lg"
          >
            {t('ctaButton')}
          </a>
        </div>
      </section>
      <ContactForm />
      <CTASection t={ctaT} />
      <script id="jsonld-about" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
