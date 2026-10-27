import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import {
  WHATSAPP_URL,
  LOCALES,
  SITE_URL,
  buildLanguages,
  sharedOpenGraph,
  sharedTwitter,
  AutoBreadcrumb,
} from '@trade/ui';
import { mdToHtml } from '@/lib/documents';
import { parseDocument } from '@/lib/documents';
import { getMessages } from '@/lib/messages';
import CopyButton from '@/components/CopyButton';

const LEGAL_FORCE: Record<string, string> = {
  in_force: 'https://schema.org/InForce',
  upcoming: 'https://schema.org/NotInForce',
  amended: 'https://schema.org/PartiallyInForce',
  repealed: 'https://schema.org/Repealed',
  draft: 'https://schema.org/NotInForce',
};

export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of LOCALES) {
    const dir = path.join(process.cwd(), 'content', locale);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.mdx')) params.push({ locale, slug: f.replace(/\.mdx$/, '') });
    }
  }
  return params;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const filePath = path.join(process.cwd(), 'content', locale, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return { title: 'Document Not Found' };
  const doc = parseDocument(slug, fs.readFileSync(filePath, 'utf-8'), locale);
  const title = doc.title;
  const description = doc.excerpt;
  const url = `${SITE_URL}/${locale}/regulations/${slug}/`;
  return {
    title,
    description,
    openGraph: sharedOpenGraph({ title, description, locale, url, type: 'article' }),
    twitter: sharedTwitter({ title, description }),
    alternates: {
      canonical: url,
      languages: buildLanguages(locale, [...LOCALES], `/regulations/${slug}/`),
    },
  };
}

export default async function RegulationPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const filePath = path.join(process.cwd(), 'content', locale, `${slug}.mdx`);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { content } = matter(raw);
  const doc = parseDocument(slug, raw, locale);
  const msgs = getMessages(locale);
  const R = msgs?.Regulations || {};
  const t = (key: string, fallback: string) => R[key] ?? fallback;

  const url = `${SITE_URL}/${locale}/regulations/${slug}/`;
  const html = mdToHtml(content);

  const legislationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Legislation',
    name: doc.title,
    legislationIdentifier: doc.docNumber || undefined,
    legislationLegalForce: LEGAL_FORCE[doc.status] || LEGAL_FORCE.in_force,
    datePublished: doc.publishedAt || undefined,
    ...(doc.effectiveAt ? { legislationDate: doc.effectiveAt } : {}),
    jurisdiction: {
      '@type': 'AdministrativeArea',
      name: 'China',
    },
    inLanguage: locale,
    url,
    description: doc.excerpt || undefined,
    isBasedOn: doc.sourceUrl || undefined,
    publisher: {
      '@type': 'GovernmentOrganization',
      name: 'General Administration of Customs of China',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };

  const statusLabel =
    {
      in_force: t('statusInForce', 'In force'),
      upcoming: t('statusUpcoming', 'Not yet in force'),
      amended: t('statusAmended', 'Amended'),
      repealed: t('statusRepealed', 'Repealed'),
      draft: t('statusDraft', 'Draft'),
    }[doc.status] || doc.status;

  const meta = [
    { label: t('docNumberLabel', 'Document No.'), value: doc.docNumber, mono: true },
    { label: t('issuerLabel', 'Issuer'), value: doc.issuer, mono: false },
    { label: t('publishedLabel', 'Published'), value: doc.publishedLabel, mono: false },
    ...(doc.effectiveLabel
      ? [{ label: t('effectiveLabel', 'In force from'), value: doc.effectiveLabel, mono: false }]
      : []),
    { label: t('statusLabel', 'Status'), value: statusLabel, mono: false },
  ].filter((m) => m.value);

  return (
    <>
      <AutoBreadcrumb locale={locale} title={doc.title} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(legislationJsonLd) }}
      />

      <section className="bg-primary-navy py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {doc.docNumber && (
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#B8960C]">{doc.docNumber}</p>
          )}
          <h1 className="mb-4 break-words text-3xl font-bold leading-tight text-white md:text-4xl">{doc.title}</h1>
          {doc.excerpt && <p className="text-lg text-white/80">{doc.excerpt}</p>}
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* 元信息条 */}
          <dl className="mb-10 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-[#F9FAFC] p-5 sm:grid-cols-2 lg:grid-cols-3">
            {meta.map((m) => (
              <div key={m.label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#5F6F7F]">{m.label}</dt>
                <dd
                  className={`mt-1 text-sm text-[#333333] ${m.mono ? 'font-mono break-words' : 'break-words'}`}
                >
                  {m.value}
                </dd>
              </div>
            ))}
          </dl>

          {doc.sourceUrl && (
            <p className="mb-8 text-sm">
              <a
                href={doc.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-primary-navy hover:text-gold transition-colors"
              >
                {t('sourceLabel', 'Official Chinese text')}
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </p>
          )}

          <article className="prose prose-lg max-w-none prose-headings:text-primary-navy prose-a:text-primary-navy prose-table:text-sm">
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </article>

          <p className="mt-10 rounded-lg border-l-4 border-[#B8960C] bg-[#FDFAF0] p-4 text-sm leading-relaxed text-[#5F6F7F]">
            {t(
              'disclaimer',
              'This is an unofficial summary prepared for exporters. The Chinese original published by the issuing authority prevails. Always verify against the official text before acting.',
            )}
          </p>

          {doc.relatedService && (
            <div className="mt-10 rounded-xl border border-gray-200 p-6">
              <p className="mb-3 text-sm font-semibold text-[#333333]">{t('relatedServiceLabel', 'Related service')}</p>
              <a
                href={`/${locale}${doc.relatedService}`}
                className="font-semibold text-primary-navy hover:text-gold transition-colors"
              >
                {t('viewService', 'See how we help with this')} →
              </a>
            </div>
          )}

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-6">
            <a href={`/${locale}/regulations/`} className="text-sm font-semibold text-primary-navy hover:text-gold">
              ← {t('backToList', 'All regulations')}
            </a>
            <CopyButton url={url} label={t('copyLink', 'Copy link')} />
          </div>
        </div>
      </section>

      <section className="bg-primary-navy py-14">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-2xl font-bold text-white md:text-3xl">
            {t('ctaTitle', 'Need help applying this rule?')}
          </h2>
          <p className="mb-6 text-white/80">{t('ctaDesc', 'Get a free compliance assessment tailored to your products.')}</p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-md bg-accent-gold px-8 py-3 font-semibold text-white transition-all hover:bg-accent-gold/90 hover:shadow-lg"
          >
            {t('ctaButton', 'Get Free Assessment')}
          </a>
        </div>
      </section>
    </>
  );
}
