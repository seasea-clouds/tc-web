import { getTranslations } from 'next-intl/server';
import { locales } from '@/i18n/routing';
import { sharedOpenGraph, sharedTwitter } from '@trade/ui/seo';
import FAQSection from '@/components/FAQSection';
import CTASection from '@/components/CTASection';
import ContactForm from '@/components/ContactForm';
import DefinitionSchema from '@/components/DefinitionSchema';
import Breadcrumb from '@/components/Breadcrumb';
// JSON-LD uses plain <script> tag — next/script does NOT render inline in App Router

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'Faq' });
  const title = t('metaTitle') || t('heroTitle');
  const description = t('metaDescription') || t('heroSubtitle');
  const url = `https://sinotradecompliance.com/${locale}/faq/`;
  return {
    title,
    description,
    openGraph: sharedOpenGraph({ title, description, locale, url }),
    twitter: sharedTwitter({ title, description }),
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        locales.map((l) => [l, `https://sinotradecompliance.com/${l}/faq/`])
      ),
    },
  };
}

export default async function FAQPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'Faq' });
  const bcT = await getTranslations({ locale, namespace: 'breadcrumb' });
  const ctaT = await getTranslations({ locale, namespace: 'ServiceCommon' });

  // Build FAQ items dynamically from translation keys (supports Q1-Q20 + Q3a/Q4a variants)
  function buildCategory(prefix: string) {
    const title = t(`${prefix}Title`);
    const items: { question: string; answer: string }[] = [];
    for (let i = 1; i <= 20; i++) {
      const qKey = `${prefix}Q${i}`;
      const aKey = `${prefix}A${i}`;
      if (t.has(qKey) && t.has(aKey)) {
        items.push({ question: t(qKey), answer: t(aKey) });
      }
      // Check for sub-answers (Q3a/A3a, Q4a/A4a)
      const qaKey = `${prefix}Q${i}a`;
      const aaKey = `${prefix}A${i}a`;
      if (t.has(qaKey) && t.has(aaKey)) {
        items.push({ question: t(qaKey), answer: t(aaKey) });
      }
      if (!t.has(qKey) && !t.has(aKey)) break;
    }
    return { title, items };
  }

  const categories = [
    { ...buildCategory('general'), prefix: 'general' as const },
    { ...buildCategory('gacc'), prefix: 'gacc' as const },
    { ...buildCategory('label'), prefix: 'label' as const },
    { ...buildCategory('ccc'), prefix: 'ccc' as const },
    { ...buildCategory('cosmetics'), prefix: 'cosmetics' as const },
    { ...buildCategory('ecommerce'), prefix: 'ecommerce' as const },
    { ...buildCategory('brand'), prefix: 'brand' as const },
  ].filter((cat) => cat.items.length > 0);

  // Build JSON-LD FAQPage structured data
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: categories.flatMap((cat) =>
      cat.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      }))
    ),
  };

  // T134: Speakable schema — mark key FAQ answers for voice search
  const speakableFaq = categories.length > 0
    ? categories[0].items.slice(0, 3).map((item) => item.answer)
    : [];
  const speakableJsonLd = speakableFaq.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['.speakable-faq-answer'],
        },
        url: `https://sinotradecompliance.com/${locale}/faq/`,
      }
    : null;

  return (
    <main>
      <Breadcrumb
        locale={locale}
        items={[
          { label: bcT('home'), href: `/${locale}/` },
          { label: t('heroTitle') },
        ]}
      />

      {/* JSON-LD */}
      <DefinitionSchema
        locale={locale}
        terms={[
          { nameKey: 'gaccName', definitionKey: 'gaccDefinition' },
          { nameKey: 'nmpaName', definitionKey: 'nmpaDefinition' },
          { nameKey: 'cccName', definitionKey: 'cccDefinition' },
          { nameKey: 'gb7718Name', definitionKey: 'gb7718Definition' },
          { nameKey: 'cbecName', definitionKey: 'cbecDefinition' },
          { nameKey: 'ciferName', definitionKey: 'ciferDefinition' },
          { nameKey: 'csarName', definitionKey: 'csarDefinition' },
          { nameKey: 'decree248Name', definitionKey: 'decree248Definition' },
          { nameKey: 'decree243Name', definitionKey: 'decree243Definition' },
          { nameKey: 'samrName', definitionKey: 'samrDefinition' },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {speakableJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableJsonLd) }}
        />
      )}

      {/* Hero */}
      <section className="py-16 bg-primary-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">{t('heroTitle')}</h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto">{t('heroSubtitle')}</p>
        </div>
      </section>

      {/* FAQ Sections — semantic dl/dt/dd */}
      <FAQSection categories={categories} />

      <ContactForm />

      <CTASection t={ctaT} />
    </main>
  );
}
