import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getPosts, parseHeadings, mdToHtml, type PostMeta } from '@/lib/posts';

const SITE_URL = 'https://trade-web-site.pages.dev';
const PORTAL_URL = 'https://trade-web-portal.pages.dev';
const WHATSAPP_URL = 'https://wa.me/message/HPPZ5X6XZSMLM1';
import { getMessages } from '@/lib/messages';
import CopyButton from '@/components/CopyButton';
import FloatingButtons from '@/components/FloatingButtons';

const LOCALES = [
  'en','zh','es','fr','de','ja','pt','ru','ar','ko','it','nl','tr','vi','id','th',
  'hi','pl','sv','el','cs','ro','hu','fi','da','no','nb','uk','bg','hr','sr','sk',
  'sl','ms','ka','he','sw','bn','ca','fa','ur','ta','af','sq','az','hy','be','ne','si','tl','te',
];

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
  if (!fs.existsSync(filePath)) {
    return { title: 'Post Not Found' };
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data } = matter(raw);
  return {
    title: data.title || slug.replace(/-/g, ' '),
    description: data.excerpt || '',
    alternates: {
      canonical: `https://sinotradecompliance.com/${locale}/blog/${slug}/`,
    },
    openGraph: {
      title: data.title || slug.replace(/-/g, ' '),
      description: data.excerpt || '',
      type: 'article',
      publishedTime: data.date,
      tags: data.category ? [data.category] : [],
      url: `https://sinotradecompliance.com/${locale}/blog/${slug}/`,
    },
  };
}

function formatDate(dateStr: string, locale: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default async function Post({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const filePath = path.join(process.cwd(), 'content', locale, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    const msgs = getMessages(locale);
    const B = msgs?.Blog || {};
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-6">🔍</div>
        <h1 className="text-3xl font-bold text-[#1B365D] mb-4">
          {B.postNotFound || 'Post Not Found'}
        </h1>
        <a href={`/${locale}/blog/`} className="text-[#2563EB] hover:underline">
          ← {B.backToBlog || 'Back to Page'}
        </a>
      </div>
    );
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  const title = data.title || slug.replace(/-/g, ' ');
  const date = data.date || '';
  const category = data.category || '';
  const excerpt = data.excerpt || '';
  const references: { title: string; url: string }[] = data.references || [];

  const wordCount = content.split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const headings = parseHeadings(raw);
  const articleHtml = mdToHtml(content);

  const allPosts = getPosts(locale);
  let relatedPosts: PostMeta[];
  if (category) {
    const sameCat = allPosts.filter(p => p.slug !== slug && p.category === category);
    if (sameCat.length >= 3) {
      relatedPosts = sameCat.slice(0, 3);
    } else {
      const others = allPosts.filter(p => p.slug !== slug && p.category !== category);
      relatedPosts = [...sameCat, ...others].slice(0, 3);
    }
  } else {
    relatedPosts = allPosts.filter(p => p.slug !== slug).slice(0, 3);
  }

  const articleUrl = `${SITE_URL}/${locale}/blog/${slug}/`;
  const encodedUrl = encodeURIComponent(articleUrl);
  const encodedTitle = encodeURIComponent(title);

  const msgs = getMessages(locale);
  const B = msgs?.Blog || {};
  const tb = (key: string, fb?: string) => B[key] ?? fb ?? key;
  const cf = (key: string, fb?: string) => (msgs?.ContactForm?.[key] ?? fb ?? key);
  const ct = (key: string, fb?: string) => (msgs?.CTA?.[key] ?? fb ?? key);
  const bc = (key: string, fb?: string) => (msgs?.breadcrumb?.[key] ?? fb ?? key);
  const href = (p: string) => `/${locale}${p}`;

  // Category → Service page mapping (matching old site)
  const CATEGORY_SERVICE_MAP: Record<string, { href: string; serviceKey: string }> = {
    'Food & Beverage': { href: '/services/gacc', serviceKey: 'gacc' },
    'Label Compliance': { href: '/services/label', serviceKey: 'label' },
    'Product Certification': { href: '/services/ccc', serviceKey: 'ccc' },
    'Cosmetics': { href: '/services/cosmetics', serviceKey: 'cosmetics' },
    'E-commerce': { href: '/services/ecommerce', serviceKey: 'ecommerce' },
  };
  const serviceInfo = CATEGORY_SERVICE_MAP[category];

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: excerpt,
    datePublished: date,
    dateModified: date,
    author: { '@type': 'Person', name: 'David Zhang' },
    publisher: {
      '@type': 'Organization',
      name: 'SinoTrade Compliance',
      url: 'https://sinotradecompliance.com',
      logo: { '@type': 'ImageObject', url: 'https://sinotradecompliance.com/logo.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://sinotradecompliance.com/${locale}/blog/${slug}/` },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

      <style dangerouslySetInnerHTML={{
        __html: `
          #article-content { counter-reset: h2-counter; }
          #article-content h2 { counter-reset: h3-counter; counter-increment: h2-counter; }
          #article-content h2::before { content: counter(h2-counter) ". "; color: #B8960C; }
          #article-content h3 { counter-increment: h3-counter; }
          #article-content h3::before { content: counter(h2-counter) "." counter(h3-counter) " "; color: #B8960C; }
        `,
      }} />

      <div className="fixed top-0 left-0 right-0 h-1 z-[60] bg-transparent">
        <div id="reading-progress" className="h-full bg-[#B8960C] transition-all duration-150" style={{ width: '0%' }} />
      </div>

      {/* Breadcrumb */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ol className="flex items-center h-12 text-sm text-gray-500">
            <li>
              <a href={href('/')} className="hover:text-[#B8960C] transition-colors font-medium">
                {bc('home', 'Home')}
              </a>
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 mx-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <a href={href('/blog/')} className="hover:text-[#B8960C] transition-colors font-medium">
                {bc('blog', 'Blog')}
              </a>
            </li>
          </ol>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[400px] flex items-end overflow-hidden bg-primary-navy">
          <div className="relative z-10 w-full">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 sm:pt-20">
              <a href={href('/blog/')}
                className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-[#B8960C] transition-colors mb-4">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {tb('backToBlog', 'Back to Insights')}
              </a>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">{title}</h1>
              {excerpt && (
                <p className="text-lg text-white/80 max-w-2xl mb-6 leading-relaxed">{excerpt}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{readTime} {tb('readTime', 'min read')}</span>
                </div>
                <span className="text-white/30">•</span>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>{tb('author', 'David Zhang')}</span>
                </div>
                {date && (<><span className="text-white/30">•</span><time dateTime={date}>{formatDate(date, locale)}</time></>)}
                {category && (<><span className="text-white/30">•</span>
                  <span className="inline-block px-3 py-1 text-xs font-semibold text-primary-navy bg-[#B8960C] rounded-full">{category}</span>
                </>)}
              </div>
              <div className="mt-6">
                <div className="flex flex-wrap items-center gap-2">
                  <a href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-[#25D366] hover:bg-[#20bd5a] rounded-md transition-colors">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12 2C6.477 2 2 6.477 2 12c0 2.038.552 3.94 1.511 5.584L2 22l4.416-1.511A9.952 9.952 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
                    Share on WhatsApp
                  </a>
                  <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-[#0A66C2] hover:bg-[#0958a8] rounded-md transition-colors">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    Share on LinkedIn
                  </a>
                  <a href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-[#000000] hover:bg-[#333] rounded-md transition-colors">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    Share on X
                  </a>
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-[#1877F2] hover:bg-[#1666d9] rounded-md transition-colors">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    Share on Facebook
                  </a>
                  <a href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-[#0088cc] hover:bg-[#0077b5] rounded-md transition-colors">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                    Share on Telegram
                  </a>
                  <a href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-gray-500 hover:bg-gray-600 rounded-md transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Share via Email
                  </a>
                  <CopyButton url={articleUrl} label="Copy link" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile TOC */}
        {headings.length > 0 && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:hidden">
            <details className="bg-[#F4F6F9] rounded-xl border border-gray-200">
              <summary className="px-5 py-3 cursor-pointer text-sm font-semibold text-[#1B365D]">{tb('toc', 'Contents')}</summary>
              <div className="px-5 pb-4">
                <nav><ul className="space-y-1.5">
                  {headings.map((h, i) => (
                    <li key={i}><a href={`#${h.id}`} className={`block text-sm transition-colors hover:text-[#B8960C] ${h.level === 3 ? 'pl-4 text-gray-500' : 'text-gray-700 font-medium'}`}>{h.text}</a></li>
                  ))}
                </ul></nav>
              </div>
            </details>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex gap-12">
            {headings.length > 0 && (
              <aside className="hidden lg:block w-64 flex-shrink-0">
                <nav className="sticky top-24" aria-label={tb('toc', 'Contents')}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-[#5F6F7F] mb-4">{tb('toc', 'Contents')}</h2>
                  <ul className="space-y-2">
                    {headings.map((h) => (
                      <li key={h.id}>
                        <a href={`#${h.id}`}
                          className={`block text-sm transition-colors ${h.level === 3 ? 'pl-4 text-[#5F6F7F] hover:text-[#B8960C]' : 'text-[#333333] font-medium hover:text-[#B8960C]'}`}>
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </aside>
            )}
            <article className="flex-1 min-w-0">
              <div id="article-content"
                className="prose prose-lg max-w-none
                  prose-headings:text-[#1B365D] prose-headings:font-bold
                  prose-h2:text-2xl prose-h3:text-xl prose-h2:font-bold prose-h3:font-semibold
                  prose-h2:mt-12 prose-h2:mb-4 prose-h2:pt-4 prose-h3:mt-8 prose-h3:mb-3 prose-h3:pt-2
                  prose-headings:counter-reset-none prose-h2:scroll-mt-28 prose-h3:scroll-mt-28
                  prose-a:text-[#B8960C] prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-[#333333] prose-li:text-[#333333] prose-p:text-[#333333] prose-p:leading-relaxed
                  prose-ul:list-[disc] prose-ul:ml-6 prose-ol:list-decimal prose-ol:ml-6
                  prose-ul:marker:text-[#B8960C] prose-ol:marker:text-[#B8960C]
                  prose-blockquote:border-l-4 prose-blockquote:border-l-[#B8960C] prose-blockquote:bg-[#F4F6F9]/50 prose-blockquote:py-3 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-[#333333]
                  prose-img:rounded-xl prose-img:shadow-md
                  prose-code:bg-[#F4F6F9] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                  prose-hr:border-[#F4F6F9]
                  prose-table:border-collapse prose-th:bg-primary-navy prose-th:text-white prose-th:px-4 prose-th:py-2
                  prose-td:border prose-td:border-[#F4F6F9] prose-td:px-4 prose-td:py-2"
                dangerouslySetInnerHTML={{ __html: articleHtml }}
              />

              {/* Author Card */}
              <div className="mt-16 pt-8 border-t border-[#F4F6F9]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-navy flex items-center justify-center text-white font-bold text-lg flex-shrink-0">D</div>
                  <div>
                    <p className="font-semibold text-[#1B365D]">{tb('author', 'David Zhang')}</p>
                    <p className="text-sm text-[#5F6F7F] mt-1">{tb('authorBio', 'Regulatory compliance expert specializing in China market entry.')}</p>
                  </div>
                </div>
              </div>

              {/* Related Service Card */}
              {serviceInfo && (
                <div className="mt-12 p-6 rounded-xl text-white" style={{ background: 'linear-gradient(to right, #1B365D, rgba(27,54,93,0.9))' }}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm mb-1 text-white/60">{tb('relatedServiceLabel', 'Need Help With This?')}</p>
                      <h3 className="text-lg font-bold">{tb('service_' + serviceInfo.serviceKey, category)}</h3>
                    </div>
                    <a
                      href={href(serviceInfo.href)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#B8960C] text-white font-semibold rounded-lg whitespace-nowrap transition-colors shadow-lg hover:bg-[#B8960C]/90"
                    >
                      {tb('relatedServiceCta', 'Get Free Assessment')}
                    </a>
                  </div>
                </div>
              )}

              {/* References */}
              {references.length > 0 && (
                <div className="mt-12 pt-8 border-t border-gray-200">
                  <h2 className="text-xl font-bold text-[#1B365D] mb-4">{tb('referencesHeading', 'References')}</h2>
                  <ul className="space-y-2">
                    {references.map((ref, i) => (
                      <li key={i}><a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2563EB] hover:underline">{ref.title}</a></li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Related Articles */}
              {relatedPosts.length > 0 && (
                <div className="mt-16">
                  <h2 className="text-2xl font-bold text-[#1B365D] mb-2">{tb('relatedArticles', 'Related Articles')}</h2>
                  <p className="text-[#5F6F7F] mb-8">{tb('relatedArticlesDesc', 'Explore more insights on this topic')}</p>
                  <ul className="space-y-4">
                    {relatedPosts.map((rp) => (
                      <li key={rp.slug}>
                        <a href={`/${locale}/blog/${rp.slug}/`}
                          className="group flex items-start gap-4 p-4 rounded-xl hover:bg-[#F4F6F9] transition-colors">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-[#1B365D] group-hover:text-[#B8960C] transition-colors line-clamp-2">{rp.title}</h3>
                            <div className="flex items-center gap-2 mt-1 text-xs text-[#5F6F7F]">
                              {rp.category && <span className="px-2 py-0.5 bg-primary-navy/10 rounded-full text-[#1B365D]">{rp.category}</span>}
                              <span>{rp.readTime} {tb('readTime', 'min read')}</span>
                            </div>
                          </div>
                          <span className="text-[#B8960C] group-hover:translate-x-1 transition-transform shrink-0 mt-1">→</span>
                        </a>
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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#B8960C]/20 mb-6">
              <svg className="w-8 h-8 text-[#B8960C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{tb('ctaTitle', 'Need Help with China Compliance?')}</h2>
            <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">{tb('ctaSubtitle', 'Get a free compliance assessment from our expert team.')}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#B8960C] text-white font-semibold rounded-lg hover:bg-[#B8960C]/90 transition-colors shadow-lg shadow-[#B8960C]/25">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                {tb('ctaButton', 'Get Free Assessment')}
              </a>
              <a href={href('/packages/')} className="text-sm text-white/60 hover:text-[#B8960C] transition-colors">{tb('viewPackages', 'View Packages →')}</a>
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section className="py-16 bg-[#F4F6F9]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-[#333333] text-center mb-4">{cf('title', 'Free Compliance Assessment')}</h2>
            <p className="text-[#5F6F7F] text-center mb-8">{cf('subtitle', "Tell us about your products and we'll provide a personalized compliance roadmap.")}</p>
            <form className="w-full max-w-lg mx-auto bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-sm" action="https://api.web3forms.com/submit" method="POST">
              <input type="hidden" name="access_key" value="b1e6d34d-9fdc-4dc1-9bb2-6fc9090b361c" />
              <input type="hidden" name="subject" value="🔥 New Inquiry — SinoTrade Website" />
              <input type="hidden" name="from_name" value="SinoTrade Website" />
              <input type="checkbox" className="hidden" style={{ display: 'none' }} name="botcheck" />
              <input type="hidden" name="redirect" value={`${SITE_URL}/${locale}/thank-you`} />
              <div className="mb-4 relative">
                <label htmlFor="ct-email" className="block text-sm font-semibold text-[#333333] mb-1 text-left">{cf('emailLabel', 'Business Email')}</label>
                <input type="email" id="ct-email" placeholder={cf('emailPlaceholder', 'you@company.com')} required className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1B365D] focus:border-transparent text-[#333333]" name="email" />
              </div>
              <div className="mb-4 relative">
                <label htmlFor="ct-message" className="block text-sm font-semibold text-[#333333] mb-1 text-left">{cf('messageLabel', 'Message (optional)')}</label>
                <textarea name="message" id="ct-message" rows={3} placeholder={cf('messagePlaceholder', 'Describe your products or compliance needs...')} className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1B365D] focus:border-transparent text-[#333333]" />
              </div>
              <button type="submit" className="w-full bg-gold hover:bg-gold/90 text-primary-navy font-bold py-3.5 px-4 rounded-lg transition-all shadow-md">{cf('button', 'Submit Free Assessment')}</button>
              <p className="text-xs text-[#5F6F7F] text-center mt-3">{cf('privacy', 'We respect your privacy. No spam, ever.')}</p>
            </form>
          </div>
        </section>

        {/* Need This Service? CTA */}
        <section className="py-16 bg-primary-navy">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{ct('ctaTitle', 'Need This Service?')}</h2>
            <p className="text-white/80 mb-2">{ct('ctaSubtitle', 'Get a free compliance assessment tailored to your products.')}</p>
            <p className="text-[#B8960C] text-sm font-medium mb-6">{ct('ctaUrgency', 'Free consultation → 24h response')}</p>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-block bg-gold hover:bg-gold/90 text-primary-navy font-semibold px-8 py-3 rounded-md transition-all hover:shadow-lg">{ct('ctaButton', 'Get Free Assessment')}</a>
          </div>
        </section>
      </main>

      <script dangerouslySetInnerHTML={{
        __html: `(function(){var b=document.getElementById('reading-progress');if(!b)return;window.addEventListener('scroll',function(){var h=document.documentElement,d=document.body;var p=((h.scrollTop||d.scrollTop)/((h.scrollHeight||d.scrollHeight)-h.clientHeight))*100;b.style.width=p+'%'})})();`,
      }} />

      <FloatingButtons />
    </>
  );
}
