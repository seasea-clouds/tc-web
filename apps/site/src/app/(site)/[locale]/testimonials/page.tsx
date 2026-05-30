import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { testimonials } from '@/data/testimonials';
import Link from 'next/link';
import Breadcrumb from '@/components/Breadcrumb';
import ContactForm from '@/components/ContactForm';
import CTASection from '@/components/CTASection';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const t = await getTranslations({ locale: resolvedParams.locale, namespace: 'Testimonials' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    openGraph: {
      title: t('ogTitle'),
      description: t('metaDescription'),
    },
  };
}

export default async function TestimonialsPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const t = await getTranslations({ locale, namespace: 'Testimonials' });
  const bcT = await getTranslations({ locale, namespace: 'breadcrumb' });
  const ctaT = await getTranslations({ locale, namespace: 'CTA' });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'SinoTrade Compliance Services',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      reviewCount: testimonials.length.toString(),
    },
    review: testimonials.map((item) => ({
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: item.rating.toString(), bestRating: '5' },
      author: { '@type': 'Organization', name: item.name },
      reviewBody: item.text,
    })),
  };

  return (
    <main className="min-h-screen bg-[#F4F6F9]">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

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

      {/* Testimonials Grid */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-5xl mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.id} className="bg-white rounded-xl shadow-md p-6 flex flex-col">
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: item.rating }).map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">★</span>
                ))}
              </div>

              {/* Text */}
              <p className="text-[#5F6F7F] leading-relaxed flex-1 text-sm sm:text-base italic">
                &ldquo;{item.text}&rdquo;
              </p>

              {/* Author */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1B365D] text-white flex items-center justify-center font-bold text-sm">
                  {item.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-[#333333] text-sm">{item.name}</p>
                  <p className="text-xs text-[#5F6F7F]">{item.industry} · {item.country}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 px-4">
        <div className="max-w-2xl mx-auto bg-[#1B365D] text-white rounded-xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">{t('ctaTitle')}</h2>
          <p className="text-white/80 mb-6">{t('ctaSubtitle')}</p>
          <Link
            href={`/${locale}/quote`}
            className="inline-block bg-white text-[#1B365D] font-bold py-3 px-8 rounded-md hover:bg-white/90 transition-colors shadow-md"
          >
            {t('ctaButton')}
          </Link>
        </div>
      </section>

      <ContactForm />
      <CTASection t={ctaT} />
    </main>
  );
}
