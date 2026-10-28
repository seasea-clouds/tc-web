import { WHATSAPP_URL, LOCALES, SITE_URL, buildLanguages, sharedOpenGraph, sharedTwitter, AutoBreadcrumb } from '@trade/ui';
import { getDocuments } from '@/lib/documents';
import { getMessages } from '@/lib/messages';
import { paginate, pagePath } from '@/lib/doc-list';
import RegulationFilter from '@/components/RegulationFilter';
import RegulationPager from '@/components/RegulationPager';
import ComplianceForm from '@/components/ComplianceForm';

export async function generateStaticParams() {
  return LOCALES.map((l) => ({ locale: l }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const R = getMessages(locale)?.Regulations || {};
  const title = R.metaTitle || 'China Regulations & GACC Decrees';
  const description = R.metaDescription || 'Official Chinese customs and regulatory documents for exporters, tracked and summarised.';
  const path = '/regulations/';
  const url = `${SITE_URL}/${locale}${path}`;
  return {
    title,
    description,
    openGraph: sharedOpenGraph({ title, description, locale, url }),
    twitter: sharedTwitter({ title, description }),
    alternates: {
      canonical: url,
      languages: buildLanguages(locale, [...LOCALES], path),
    },
  };
}

export default async function RegulationsHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const docs = getDocuments(locale);
  const pages = paginate(docs);
  const msgs = getMessages(locale);
  const R = msgs?.Regulations || {};
  const t = (key: string, fallback: string) => R[key] ?? fallback;
  const CF = msgs?.ContactForm || {};

  const statusLabels: Record<string, string> = {
    in_force: t('statusInForce', 'In force'),
    upcoming: t('statusUpcoming', 'Not yet in force'),
    amended: t('statusAmended', 'Amended'),
    repealed: t('statusRepealed', 'Repealed'),
    draft: t('statusDraft', 'Draft'),
  };

  return (
    <>
      <AutoBreadcrumb locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: t('title', 'China Regulations & GACC Decrees'),
            description: t('subtitle', 'Official Chinese customs and regulatory documents for exporters, tracked and summarised.'),
            url: `${SITE_URL}/${locale}/regulations/`,
            publisher: {
              '@type': 'Organization',
              name: 'SinoTrade Compliance',
              url: 'https://sinotradecompliance.com',
            },
          }),
        }}
      />

      <section className="py-16 bg-primary-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 break-words">
            {t('title', 'China Regulations & GACC Decrees')}
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto">
            {t('subtitle', 'Official Chinese customs and regulatory documents for exporters, tracked and summarised.')}
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RegulationFilter
            docs={docs}
            pageDocs={pages[0] ?? []}
            locale={locale}
            texts={{
              colDocNumber: t('colDocNumber', 'Document No.'),
              colTitle: t('colTitle', 'Title'),
              colPublished: t('colPublished', 'Published'),
              colEffective: t('colEffective', 'In force'),
              colStatus: t('colStatus', 'Status'),
              noDocs: t('noDocs', 'No documents yet.'),
              statusLabels,
              filterIssuer: t('filterIssuer', 'Issuing authority'),
              filterCategory: t('filterCategory', 'Category'),
              filterStatus: t('filterStatus', 'Status'),
              filterAll: t('filterAll', 'All'),
              filterReset: t('filterReset', 'Reset'),
              filterEmpty: t('filterEmpty', 'No documents match these filters.'),
            }}
          >
            <RegulationPager
              locale={locale}
              currentPage={1}
              totalPages={pages.length}
              paginationText={t('pagination', 'Page')}
              prevText={t('prev', 'Previous')}
              nextText={t('next', 'Next')}
            />
          </RegulationFilter>
        </div>
      </section>

      <section className="py-16 bg-primary-navy">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{t('ctaTitle', 'Need help applying this rule?')}</h2>
          <p className="text-white/80 mb-6">{t('ctaDesc', 'Get a free compliance assessment tailored to your products.')}</p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-accent-gold hover:bg-accent-gold/90 text-white font-semibold px-8 py-3 rounded-md transition-all hover:shadow-lg"
          >
            {t('ctaButton', 'Get Free Assessment')}
          </a>
        </div>
      </section>

      <ComplianceForm
        locale={locale}
        subject={`🔥 New Inquiry — Regulations List`}
        idPrefix="list"
        texts={{
          title: CF.title,
          subtitle: CF.subtitle,
          emailLabel: CF.emailLabel,
          emailPlaceholder: CF.emailPlaceholder,
          messageLabel: CF.messageLabel,
          messagePlaceholder: CF.messagePlaceholder,
          button: CF.button,
          privacy: CF.privacy,
        }}
      />
    </>
  );
}
