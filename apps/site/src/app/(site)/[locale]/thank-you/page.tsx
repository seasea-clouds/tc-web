import { getTranslations } from 'next-intl/server';
import { locales } from '@/i18n/routing';
import { sharedOpenGraph, sharedTwitter } from '@/lib/metadata';
import { MessageCircle, CheckCircle, Clock, Shield, Users, Globe } from 'lucide-react';
import { getAllPostsMeta } from '@/lib/blog';
import Link from 'next/link';
import { WHATSAPP_URL } from '@/lib/constants';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'ThankYou' });
  const title = `${t('title')} — SinoTrade Compliance`;
  const description = t('subtitle');
  const url = `https://sinotradecompliance.com/${locale}/thank-you/`;

  return {
    title,
    description,
    openGraph: sharedOpenGraph({ title, description, locale, url }),
    twitter: sharedTwitter({ title, description }),
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        locales.map((l) => [l, `https://sinotradecompliance.com/${l}/thank-you/`])
      ),
    },
  };
}

export default async function ThankYouPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'ThankYou' });
  const title = t('title');
  const subtitle = t('subtitle');

  const posts = getAllPostsMeta(locale).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": `${title} — SinoTrade Compliance`,
    "description": subtitle,
    "url": `https://sinotradecompliance.com/${locale}/thank-you/`,
    "publisher": {"@type": "Organization", "name": "SinoTrade Compliance"},
  };

  const services = [
    { key: 'gacc', labelKey: 'serviceGacc' },
    { key: 'label', labelKey: 'serviceLabel' },
    { key: 'ccc', labelKey: 'serviceCcc' },
    { key: 'cosmetics', labelKey: 'serviceCosmetics' },
    { key: 'ecommerce', labelKey: 'serviceEcommerce' },
    { key: 'brand', labelKey: 'serviceBrand' },
  ];

  const stats = [
    { icon: Users, number: t('stat1Number'), label: t('stat1Label') },
    { icon: Globe, number: t('stat2Number'), label: t('stat2Label') },
    { icon: Clock, number: t('stat3Number'), label: t('stat3Label') },
    { icon: Shield, number: t('stat4Number'), label: t('stat4Label') },
  ];

  return (
    <main className="flex flex-col min-h-screen">

      {/* Hero Section */}
      <section className="bg-primary-navy py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            {title}
          </h1>
          <p className="text-lg sm:text-xl text-white/80 mb-4 leading-relaxed">
            {subtitle}
          </p>
          <p className="text-base text-white/60 mb-8 leading-relaxed">
            {t('waitMsg')}
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#25D366]/90 text-white font-bold py-4 px-8 rounded-md transition-all hover:shadow-lg"
          >
            <MessageCircle className="w-5 h-5" />
            {t('whatsappCta')}
          </a>
        </div>
      </section>

      {/* Trust Stats */}
      <section className="py-12 bg-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-primary-navy text-center mb-8">{t('trustTitle')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <stat.icon className="w-8 h-8 text-accent-gold mx-auto mb-2" />
                <div className="text-2xl font-bold text-primary-navy">{stat.number}</div>
                <div className="text-sm text-text-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* While You Wait: Blog Posts */}
      {posts.length > 0 && (
        <section className="py-16 bg-[#F4F6F9] px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-primary-navy text-center mb-2">{t('blogTitle')}</h2>
            <p className="text-[#5F6F7F] text-center mb-8">{t('blogDesc') || 'Explore more insights'}</p>
            <ul className="space-y-4">
              {posts.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/${locale}/blog/${post.slug}/`}
                    className="group flex items-start gap-4 p-4 rounded-xl bg-white hover:bg-[#F4F6F9] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-[#1B365D] group-hover:text-[#B8960C] transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#5F6F7F]">
                        <span className="px-2 py-0.5 bg-primary-navy/10 rounded-full text-[#1B365D]">
                          {post.category}
                        </span>
                        <time dateTime={post.date}>{post.date}</time>
                        <span>{post.readTime} {t('readTime')}</span>
                      </div>
                    </div>
                    <span className="text-[#B8960C] group-hover:translate-x-1 transition-transform shrink-0 mt-1">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="text-center mt-8">
              <Link
                href={`/${locale}/blog`}
                className="text-accent-gold hover:text-accent-gold/80 font-semibold transition-colors"
              >
                {t('viewAllBlog')} →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Our Services */}
      <section className="py-16 bg-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-primary-navy text-center mb-8">{t('servicesTitle')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {services.map((s) => (
              <Link
                key={s.key}
                href={`/${locale}/services/${s.key}`}
                className="block p-4 rounded-lg border border-gray-200 hover:border-accent-gold hover:shadow-md transition-all text-center"
              >
                <span className="text-sm font-semibold text-primary-navy">{t(s.labelKey)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Back to Home */}
      <section className="py-8 bg-[#F4F6F9] text-center px-4">
        <Link
          href={`/${locale}/`}
          className="text-primary-navy hover:text-primary-navy/80 font-medium transition-colors"
        >
          ← {t('back')}
        </Link>
      </section>


      <script
        id="jsonld-thankyou"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
