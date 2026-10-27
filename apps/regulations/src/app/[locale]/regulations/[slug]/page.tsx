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
import { mdToHtml, parseDocument, splitBody, getOriginalMarkdown } from '@/lib/documents';
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
  const url = `${SITE_URL}/${locale}/regulations/${slug}/`;
  return {
    title: doc.title,
    description: doc.excerpt,
    openGraph: sharedOpenGraph({ title: doc.title, description: doc.excerpt, locale, url, type: 'article' }),
    twitter: sharedTwitter({ title: doc.title, description: doc.excerpt }),
    alternates: {
      canonical: url,
      languages: buildLanguages(locale, [...LOCALES], `/regulations/${slug}/`),
    },
  };
}

/** 分析区与译文区共用的正文排版 */
const PROSE_CLASS = `prose prose-lg max-w-none
  prose-headings:text-[#1B365D] prose-headings:font-bold
  prose-h2:text-2xl prose-h3:text-xl
  prose-h2:mt-10 prose-h2:mb-4 prose-h3:mt-8 prose-h3:mb-3
  prose-a:text-[#B8960C] prose-a:no-underline hover:prose-a:underline
  prose-strong:text-[#333333] prose-li:text-[#333333] prose-p:text-[#333333] prose-p:leading-relaxed
  prose-ul:list-[disc] prose-ul:ml-6 prose-ol:list-decimal prose-ol:ml-6
  prose-ul:marker:text-[#B8960C] prose-ol:marker:text-[#B8960C]
  prose-blockquote:border-l-4 prose-blockquote:border-l-[#B8960C] prose-blockquote:bg-[#F4F6F9]/50 prose-blockquote:py-3 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
  prose-img:rounded-xl prose-img:shadow-md
  prose-table:border-collapse prose-th:bg-primary-navy prose-th:text-white prose-th:px-4 prose-th:py-2
  prose-td:border prose-td:border-[#E5E9EE] prose-td:px-4 prose-td:py-2`;

export default async function RegulationPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const filePath = path.join(process.cwd(), 'content', locale, `${slug}.mdx`);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data } = matter(raw);
  const doc = parseDocument(slug, raw, locale);
  const msgs = getMessages(locale);
  const R = msgs?.Regulations || {};
  const CF = msgs?.ContactForm || {};
  const CTA = msgs?.CTA || {};
  const services = msgs?.Navbar?.servicesDropdown || {};
  const t = (key: string, fallback = ''): string => (R as Record<string, string | undefined>)[key] ?? fallback;

  const { analysis, translation } = splitBody(raw);
  const originalMd = getOriginalMarkdown(slug);
  const analysisHtml = mdToHtml(analysis);
  const translationHtml = translation ? mdToHtml(translation) : '';
  const originalHtml = originalMd ? mdToHtml(originalMd) : '';

  const serviceKey = (doc.relatedService || '').match(/\/services\/([^/]+)\//)?.[1] || '';
  const serviceName = serviceKey ? services[serviceKey] || '' : '';

  const url = `${SITE_URL}/${locale}/regulations/${slug}/`;

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
      in_force: t('statusInForce'),
      upcoming: t('statusUpcoming'),
      amended: t('statusAmended'),
      repealed: t('statusRepealed'),
      draft: t('statusDraft'),
    }[doc.status] || doc.status;

  const meta = [
    { label: t('colDocNumber'), value: doc.docNumber, mono: true },
    { label: t('issuerLabel'), value: doc.issuer, mono: false },
    { label: t('colPublished'), value: doc.publishedLabel, mono: false },
    ...(doc.effectiveLabel
      ? [{ label: t('colEffective'), value: doc.effectiveLabel, mono: false }]
      : []),
    { label: t('colStatus'), value: statusLabel, mono: false },
  ].filter((m) => m.value);

  return (
    <>
      <AutoBreadcrumb locale={locale} title={doc.title} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(legislationJsonLd) }}
      />

      {/* ── Hero ── */}
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
          {/* ── 元信息条 ── */}
          <dl className="mb-8 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-[#F9FAFC] p-5 sm:grid-cols-2 lg:grid-cols-3">
            {meta.map((m) => (
              <div key={m.label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#5F6F7F]">{m.label}</dt>
                <dd className={`mt-1 text-sm text-[#333333] ${m.mono ? 'font-mono break-words' : 'break-words'}`}>
                  {m.value}
                </dd>
              </div>
            ))}
          </dl>

          {doc.sourceUrl && (
            <p className="mb-10 text-sm">
              <a
                href={doc.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-primary-navy hover:text-gold transition-colors"
              >
                {t('sourceLabel')}
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

          {/* ── 我们的分析 ── */}
          <div id="analysis">
            <div className="mb-6 border-l-4 border-[#B8960C] pl-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5F6F7F]">
                {t('analysisKicker')}
              </p>
              <h2 className="text-2xl font-bold text-[#1B365D]">{t('analysisHeading')}</h2>
            </div>
            <div className={PROSE_CLASS} dangerouslySetInnerHTML={{ __html: analysisHtml }} />
          </div>

          {/* ── 官方原文（中文，全语言共用一份） ── */}
          {originalHtml && (
            <div id="original" className="mt-14 overflow-hidden rounded-2xl border border-[#E1E6EC] bg-[#F7F8FA]">
              <div className="flex flex-col gap-2 border-b border-[#E1E6EC] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#5F6F7F]">
                    {t('originalKicker')}
                  </p>
                  <h2 className="text-xl font-bold text-[#1B365D]">{t('originalHeading')}</h2>
                </div>
                {doc.sourceUrl && (
                  <a
                    href={doc.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-primary-navy hover:text-gold transition-colors"
                  >
                    gov.cn ↗
                  </a>
                )}
              </div>
              <div
                lang="zh-CN"
                className="max-h-[620px] overflow-y-auto px-5 py-5 text-[15px] leading-8 text-[#333333] sm:px-7 [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-[#1B365D] [&_p]:mb-3 [&_p:first-child]:text-center [&_p:first-child]:font-bold [&_p:first-child]:text-lg [&_strong]:font-semibold [&_strong]:text-[#1B365D]"
                dangerouslySetInnerHTML={{ __html: originalHtml }}
              />
              <p className="border-t border-[#E1E6EC] px-5 py-3 text-xs leading-relaxed text-[#5F6F7F] sm:px-7">
                {t('originalNote')}
              </p>
            </div>
          )}

          {/* ── 原文译文（本地语言，节选） ── */}
          {translationHtml && (
            <div id="translation" className="mt-12">
              <div className="mb-6 flex flex-wrap items-center gap-3 border-l-4 border-primary-navy pl-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#5F6F7F]">
                    {t('translationKicker')}
                  </p>
                  <h2 className="text-2xl font-bold text-[#1B365D]">
                    {t('translationHeading')}
                  </h2>
                </div>
              </div>
              <div className={PROSE_CLASS} dangerouslySetInnerHTML={{ __html: translationHtml }} />
              <p className="mt-6 rounded-lg border-l-4 border-[#B8960C] bg-[#FDFAF0] p-4 text-sm leading-relaxed text-[#5F6F7F]">
                {t('translationNote')}
              </p>
            </div>
          )}

          {/* ── 免责 ── */}
          <p className="mt-10 text-sm leading-relaxed text-[#5F6F7F]">
            {t('disclaimer')}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-6">
            <a href={`/${locale}/regulations/`} className="text-sm font-semibold text-primary-navy hover:text-gold">
              ← {t('backToList')}
            </a>
            <CopyButton url={url} label={t('copyLink')} />
          </div>
        </div>
      </section>

      {/* ── 相关服务（与博客文章详情页同款） ── */}
      {serviceName && doc.relatedService && (
        <section className="pb-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div
              className="rounded-xl p-6 text-white"
              style={{ background: 'linear-gradient(to right, #1B365D, rgba(27,54,93,0.9))' }}
            >
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: 'rgba(184,150,12,0.2)' }}
                >
                  <svg className="h-6 w-6 text-[#B8960C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="mb-1 text-sm text-white/60">
                    {t('serviceCtaLabel')}
                  </p>
                  <h3 className="text-lg font-bold">{serviceName}</h3>
                </div>
                <a
                  href={`/${locale}${doc.relatedService}`}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#B8960C] px-6 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-[#B8960C]/90"
                >
                  {t('ctaButton')}
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA：需要办理中国合规业务？（与博客底部同款） ── */}
      <section className="bg-primary-navy py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#B8960C]/20">
            <svg className="h-8 w-8 text-[#B8960C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="mb-4 text-2xl font-bold text-white md:text-3xl">
            {t('ctaSectionTitle')}
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-white/70">
            {t('ctaSectionSubtitle')}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#B8960C] px-8 py-4 font-semibold text-white shadow-lg shadow-[#B8960C]/25 transition-colors hover:bg-[#B8960C]/90"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {t('ctaButton')}
            </a>
            <a href={`/${locale}/packages/`} className="text-sm text-white/60 transition-colors hover:text-[#B8960C]">
              {t('viewPackages')}
            </a>
          </div>
        </div>
      </section>

      {/* ── 免费合规评估表单（与博客底部同款） ── */}
      <section className="bg-[#F4F6F9] py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
            <svg className="h-6 w-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mb-3 text-2xl font-bold text-[#333333] md:text-3xl">{CF.title}</h2>
          <p className="mb-8 leading-relaxed text-[#5F6F7F]">{CF.subtitle}</p>
          <form
            className="mx-auto w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
            action="https://api.web3forms.com/submit"
            method="POST"
          >
            <input type="hidden" name="access_key" value={process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY} />
            <input type="hidden" name="subject" value={`🔥 New Inquiry — Regulations: ${slug}`} />
            <input type="hidden" name="from_name" value="SinoTrade Regulations" />
            <input type="checkbox" className="hidden" style={{ display: 'none' }} name="botcheck" />
            <input type="hidden" name="redirect" value={`${SITE_URL}/${locale}/thank-you`} />
            <div className="relative mb-4">
              <label htmlFor="ct-email" className="mb-1 block text-left text-sm font-semibold text-[#333333]">
                {CF.emailLabel}
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5F6F7F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  type="email"
                  id="ct-email"
                  placeholder={CF.emailPlaceholder}
                  required
                  className="w-full rounded-md border border-gray-300 py-3 pl-10 pr-4 text-[#333333] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1B365D]"
                  name="email"
                />
              </div>
            </div>
            <div className="relative mb-4">
              <label htmlFor="ct-message" className="mb-1 block text-left text-sm font-semibold text-[#333333]">
                {CF.messageLabel}
              </label>
              <textarea
                name="message"
                id="ct-message"
                rows={3}
                placeholder={CF.messagePlaceholder}
                className="w-full rounded-md border border-gray-300 py-3 pl-4 pr-4 text-[#333333] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1B365D]"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-gold px-4 py-3.5 font-bold text-primary-navy shadow-md transition-all hover:bg-gold/90"
            >
              {CF.button}
            </button>
            <p className="mt-3 text-center text-xs text-[#5F6F7F]">{CF.privacy}</p>
          </form>
        </div>
      </section>

      {/* ── 需要这项服务？ ── */}
      <section className="bg-primary-navy py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-2xl font-bold text-white md:text-3xl">{CTA.ctaTitle}</h2>
          <p className="mb-6 text-white/80">{CTA.ctaSubtitle}</p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-md bg-accent-gold px-8 py-3 font-semibold text-white transition-all hover:bg-accent-gold/90 hover:shadow-lg"
          >
            {CTA.ctaButton}
          </a>
        </div>
      </section>
    </>
  );
}
