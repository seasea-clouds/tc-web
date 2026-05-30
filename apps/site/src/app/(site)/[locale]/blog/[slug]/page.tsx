import { getTranslations } from 'next-intl/server';
import { getAllPostSlugs, getPostBySlug, getRelatedPosts, locales } from '@/lib/blog';
import { sharedOpenGraph, sharedTwitter } from '@/lib/metadata';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import RelatedServiceCard from '@/components/RelatedServiceCard';
import ShareButtons from '@/components/ShareButtons';
import Breadcrumb from '@/components/Breadcrumb';
import DefinitionSchema from '@/components/DefinitionSchema';
import ReferencesSection from '@/components/ReferencesSection';
import { WHATSAPP_URL } from '@/lib/constants';
import ContactForm from '@/components/ContactForm';
import CTASection from '@/components/CTASection';
import MobileTOC from '@/components/MobileTOC';
import FaqPageSchema from '@/components/FaqPageSchema';

/** Map blog slug → translation namespace for FAQ */
const FAQ_NS: Record<string, string> = {
  'gacc-registration-guide': 'BlogFaqGaccRegistrationGuide',
  'china-label-compliance': 'BlogFaqChinaLabelCompliance',
  'ccc-certification-explained': 'BlogFaqCccCertificationExplained',
  'cosmetics-nmpa-filing': 'BlogFaqCosmeticsNmpaFiling',
  'cross-border-ecommerce-china': 'BlogFaqCrossBorderEcommerceChina',
};

export function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of locales) {
    const slugs = getAllPostSlugs(locale);
    for (const slug of slugs) {
      params.push({ locale, slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'Blog' });
  const post = await getPostBySlug(locale, slug);
  if (!post) return { title: t('postNotFound') };
  const url = `https://sinotradecompliance.com/${locale}/blog/${slug}/`;
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: sharedOpenGraph({ title: post.title, description: post.excerpt, locale, url }),
    twitter: sharedTwitter({ title: post.title, description: post.excerpt }),
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        locales.map((l) => [l, `https://sinotradecompliance.com/${l}/blog/${slug}/`])
      ),
    },
  };
}

// Extract headings from HTML for table of contents
function extractHeadings(html: string) {
  const headings: { level: number; text: string; id: string }[] = [];
  const regex = /<(h[23])[^>]*>(.*?)<\/\1>/g;
  let match;
  let index = 0;
  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1].charAt(1));
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    const id = `section-${index++}`;
    headings.push({ level, text, id });
  }
  return headings;
}

// Add IDs to headings in HTML
function addHeadingIds(html: string): string {
  let index = 0;
  return html.replace(/<(h[23])([^>]*)>(.*?)<\/\1>/g, (match, tag, attrs, content) => {
    const id = `section-${index++}`;
    // Check if id already exists
    if (attrs.includes('id=')) return match;
    return `<${tag}${attrs} id="${id}">${content}</${tag}>`;
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = await getPostBySlug(locale, slug);
  if (!post) notFound();

  const t = await getTranslations({ locale, namespace: 'Blog' });
  const bcT = await getTranslations({ locale, namespace: 'breadcrumb' });
  const ctaT = await getTranslations({ locale, namespace: 'CTA' });

  // FAQ translations (from messages/{locale}.json BlogFaq* namespaces)
  const faqNs = FAQ_NS[slug];
  let faqItems: { question: string; answer: string }[] = [];
  if (faqNs) {
    try {
      const faqT = await getTranslations({ locale, namespace: faqNs });
      for (let i = 1; i <= 10; i++) {
        const rawQ = faqT.raw(`faqQ${i}`) as string;
        const rawA = faqT.raw(`faqA${i}`) as string;
        // If raw value contains the key (not translated), stop
        if (rawQ.includes(`faqQ${i}`) || rawA.includes(`faqA${i}`)) break;
        faqItems.push({ question: rawQ, answer: rawA });
      }
    } catch { /* no FAQ namespace for this slug */ }
  }

  const headings = extractHeadings(post.contentHtml);
  const contentWithIds = addHeadingIds(post.contentHtml);

  // Related content
  const relatedPosts = getRelatedPosts(locale, post.category, slug, 3);
  const articleUrl = `https://sinotradecompliance.com/${locale}/blog/${slug}/`;

  // JSON-LD BlogPosting schema
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Person',
      name: 'David Zhang',
    },
    publisher: {
      '@type': 'Organization',
      name: 'SinoTrade Compliance',
      url: 'https://sinotradecompliance.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://sinotradecompliance.com/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://sinotradecompliance.com/${locale}/blog/${slug}/`,
    },

  };

  return (
    <>
      {/* JSON-LD BlogPosting */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      {/* JSON-LD FAQPage */}
      <FaqPageSchema items={faqItems} />

      {/* Breadcrumb */}
      <Breadcrumb
        locale={locale}
        items={[
          { label: bcT('home'), href: `/${locale}/` },
          { label: bcT('blog'), href: `/${locale}/blog` },
          { label: post.title },
        ]}
      />

      {/* Definition Schema for compliance terms */}
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

      {/* Heading numbering CSS counters */}
      <style dangerouslySetInnerHTML={{
        __html: `
          #article-content { counter-reset: h2-counter; }
          #article-content h2 { counter-reset: h3-counter; counter-increment: h2-counter; }
          #article-content h2::before {
            content: counter(h2-counter) ". ";
            color: #B8960C;
          }
          #article-content h3 { counter-increment: h3-counter; }
          #article-content h3::before {
            content: counter(h2-counter) "." counter(h3-counter) " ";
            color: #B8960C;
          }
        `,
      }} />

      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[60] bg-transparent">
        <div
          id="reading-progress"
          className="h-full bg-[#B8960C] transition-all duration-150"
          style={{ width: '0%' }}
        />
      </div>

      <main>
      {/* Hero Section */}
      <section className="relative min-h-[400px] flex items-end overflow-hidden bg-primary-navy">
        {/* Hero content */}
        <div className="relative z-10 w-full">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 sm:pt-20">
            {/* Back link */}
            <Link
              href={`/${locale}/blog/`}
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-[#B8960C] transition-colors mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('backToBlog')}
            </Link>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              {post.title}
            </h1>

            {/* Excerpt */}
            <p className="text-lg text-white/80 max-w-2xl mb-6 leading-relaxed">
              {post.excerpt}
            </p>

            {/* Meta bar */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
  
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{post.readTime} {t('readTime')}</span>
              </div>
              <span className="text-white/30">•</span>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{t('author')}</span>
              </div>
              <span className="text-white/30">•</span>
              <span className="inline-block px-3 py-1 text-xs font-semibold text-primary-navy bg-[#B8960C] rounded-full">
                {post.category}
              </span>
            </div>

            {/* Share Buttons */}
            <div className="mt-4">
              <ShareButtons
                title={post.title}
                url={articleUrl}
                shareLabel={t('shareThisArticle') || 'Share this article'}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mobile TOC — collapsible table of contents */}
      {headings.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <MobileTOC headings={headings} label={t('toc') || 'Contents'} />
        </div>
      )}

      {/* Main Content with Sidebar TOC */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex gap-12">
          {/* Table of Contents — sticky sidebar (desktop only) */}
          {headings.length > 0 && (
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <nav className="sticky top-24" aria-label={t('toc') || 'Contents'}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#5F6F7F] mb-4">
                  {t('toc') || 'Contents'}
                </h2>
                <ul className="space-y-2">
                  {headings.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className={`block text-sm transition-colors ${
                          h.level === 3
                            ? 'pl-4 text-[#5F6F7F] hover:text-[#B8960C]'
                            : 'text-[#333333] font-medium hover:text-[#B8960C]'
                        }`}
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>
          )}

          {/* Article Content */}
          <article className="flex-1 min-w-0">
            <div
              className="prose prose-lg max-w-none
                prose-headings:text-[#1B365D]
                prose-headings:font-bold
                prose-h2:text-2xl prose-h3:text-xl
                prose-h2:font-bold prose-h3:font-semibold
                prose-h2:mt-12 prose-h2:mb-4 prose-h2:pt-4
                prose-h3:mt-8 prose-h3:mb-3 prose-h3:pt-2
                prose-headings:counter-reset-none
                prose-h2:scroll-mt-28 prose-h3:scroll-mt-28
                prose-a:text-[#B8960C]
                prose-a:no-underline hover:prose-a:underline
                prose-strong:text-[#333333]
                prose-li:text-[#333333]
                prose-p:text-[#333333]
                prose-p:leading-relaxed
                prose-ul:list-[disc] prose-ul:ml-6
                prose-ol:list-decimal prose-ol:ml-6
                prose-ul:marker:text-[#B8960C]
                prose-ol:marker:text-[#B8960C]
                prose-blockquote:border-l-4 prose-blockquote:border-l-[#B8960C] prose-blockquote:bg-[#F4F6F9]/50 prose-blockquote:py-3 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-[#333333]
                prose-img:rounded-xl
                prose-img:shadow-md
                prose-code:bg-[#F4F6F9]
                prose-code:px-1.5 prose-code:py-0.5
                prose-code:rounded
                prose-code:text-sm
                prose-hr:border-[#F4F6F9]
                prose-table:border-collapse
                prose-th:bg-primary-navy
                prose-th:text-white
                prose-th:px-4 prose-th:py-2
                prose-td:border prose-td:border-[#F4F6F9]
                prose-td:px-4 prose-td:py-2"
              dangerouslySetInnerHTML={{ __html: contentWithIds }}
              id="article-content"
            />

            {/* Article Footer — Author Card */}
            <div className="mt-16 pt-8 border-t border-[#F4F6F9]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-navy flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  D
                </div>
                <div>
                  <p className="font-semibold text-[#1B365D]">{t('author')}</p>
                  <p className="text-sm text-[#5F6F7F] mt-1">
                    {t('authorBio')}
                  </p>
                </div>
              </div>
            </div>

            {/* Related Service Card (T6) */}
            <RelatedServiceCard locale={locale} category={post.category} />

            {/* References (T23) */}
            <ReferencesSection references={post.references} heading={t('references') || 'References'} />

            {/* Related Articles (T7) */}
            {relatedPosts.length > 0 && (
              <div className="mt-16">
                <h2 className="text-2xl font-bold text-[#1B365D] mb-2">
                  {t('relatedArticles')}
                </h2>
                <p className="text-[#5F6F7F] mb-8">{t('relatedArticlesDesc')}</p>
                <ul className="space-y-4">
                  {relatedPosts.map((rp) => (
                    <li key={rp.slug}>
                      <Link
                        href={`/${rp.locale}/blog/${rp.slug}/`}
                        className="group flex items-start gap-4 p-4 rounded-xl hover:bg-[#F4F6F9] transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-[#1B365D] group-hover:text-[#B8960C] transition-colors line-clamp-2">
                            {rp.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-[#5F6F7F]">
                            <span className="px-2 py-0.5 bg-primary-navy/10 rounded-full text-[#1B365D]">
                              {rp.category}
                            </span>
                            <span>{rp.readTime} {t('readTime')}</span>
                          </div>
                        </div>
                        <span className="text-[#B8960C] group-hover:translate-x-1 transition-transform shrink-0 mt-1">
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        </div>
      </div>

      {/* CTA Section */}
      <section className="py-16 bg-primary-navy">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Decorative icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#B8960C]/20 mb-6">
            <svg className="w-8 h-8 text-[#B8960C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {t('ctaTitle')}
          </h2>
          <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
            {t('ctaSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#B8960C] text-white font-semibold rounded-lg hover:bg-[#B8960C]/90 transition-colors shadow-lg shadow-[#B8960C]/25"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {t('ctaButton')}
            </a>
            <Link
              href={`/${locale}/packages/`}
              className="text-sm text-white/60 hover:text-[#B8960C] transition-colors"
            >
              {t('viewPackages') || 'View Packages →'}
            </Link>
          </div>
        </div>
      </section>

      <ContactForm />
      <CTASection t={ctaT} />
      </main>

      {/* Reading progress script */}
      <script dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var bar = document.getElementById('reading-progress');
            if (!bar) return;
            window.addEventListener('scroll', function() {
              var h = document.documentElement;
              var b = document.body;
              var st = 'scrollTop';
              var sh = 'scrollHeight';
              var progress = ((h[st]||b[st]) / ((h[sh]||b[sh]) - h.clientHeight)) * 100;
              bar.style.width = progress + '%';
            });
          })();
        `,
      }} />
    </>
  );
}
