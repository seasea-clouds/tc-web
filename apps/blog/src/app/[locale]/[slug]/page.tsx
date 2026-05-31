import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getPosts, parseHeadings, mdToHtml, type PostMeta } from '@/lib/posts';
import { getMessages } from '@/lib/messages';
import CopyButton from '@/components/CopyButton';

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

const SITE_URL = 'https://sinotradecompliance.com';

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

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    'Food & Beverage': '🍷',
    'Cosmetics': '💄',
    'Electronics': '🔌',
    'Toys': '🧸',
    'Textile': '👕',
    'Health Supplements': '💊',
    'Product Certification': '✅',
    'Label Compliance': '🏷️',
    'Brand Protection': '🛡️',
    'E-commerce': '🌐',
    'Compliance Guide': '📋',
  };
  return map[category] || '📝';
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
        <a href={`/${locale}/`} className="text-[#2563EB] hover:underline">
          ← {B.backToBlog || 'Back to Insights'}
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

  // Word count & read time
  const wordCount = content.split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  // TOC
  const headings = parseHeadings(raw);

  // Article HTML
  const articleHtml = mdToHtml(content);

  // Related posts (same category first, then fallback to recent)
  const allPosts = getPosts(locale);
  let relatedPosts: PostMeta[];
  if (category) {
    const sameCat = allPosts.filter(p => p.slug !== slug && p.category === category);
    if (sameCat.length >= 3) {
      relatedPosts = sameCat.slice(0, 3);
    } else {
      // Mix same-category + other recent
      const others = allPosts.filter(p => p.slug !== slug && p.category !== category);
      relatedPosts = [...sameCat, ...others].slice(0, 3);
    }
  } else {
    relatedPosts = allPosts.filter(p => p.slug !== slug).slice(0, 3);
  }

  // Full article URL for sharing
  const articleUrl = `${SITE_URL}/${locale}/blog/${slug}/`;
  const encodedUrl = encodeURIComponent(articleUrl);
  const encodedTitle = encodeURIComponent(title);

  // Messages
  const msgs = getMessages(locale);
  const B = msgs?.Blog || {};
  const tb = (key: string, fb?: string) => B[key] ?? fb ?? key;
  const btn = (key: string, fb?: string) => (msgs?.Navbar?.[key] ?? fb ?? key);

  const href = (p: string) => `/${locale}${p}`;

  return (
    <>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ol className="flex items-center h-12 text-sm text-gray-500">
            <li>
              <a href={href('/')} className="hover:text-[#2563EB] transition-colors font-medium">
                {btn('home', 'Home')}
              </a>
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 mx-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <a href={href('/blog/')} className="hover:text-[#2563EB] transition-colors font-medium">
                {tb('backToBlog', 'Insights')}
              </a>
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 mx-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-gray-400 truncate max-w-[200px] sm:max-w-[400px]">{title}</span>
            </li>
          </ol>
        </div>
      </nav>

      {/* Main Content: Two Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Left Column — Article */}
          <article className="flex-1 min-w-0 max-w-3xl">
            {/* Back link */}
            <a
              href={href('/blog/')}
              className="inline-flex items-center gap-1 text-sm text-[#2563EB] hover:text-[#1d4ed8] font-medium mb-6 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {tb('backToBlog', 'Back to Insights')}
            </a>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1B365D] mb-4 leading-tight">
              {title}
            </h1>

            {/* Excerpt */}
            {excerpt && (
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                {excerpt}
              </p>
            )}

            {/* Meta: read time | author | category */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-8 pb-6 border-b border-gray-100">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {readTime} {tb('readTime', 'min read')}
              </span>
              <span className="text-gray-300">•</span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {tb('author', 'David Zhang')}
              </span>
              {date && (
                <>
                  <span className="text-gray-300">•</span>
                  <time dateTime={date}>{formatDate(date, locale)}</time>
                </>
              )}
              {category && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1B365D]/5 text-[#1B365D] text-xs font-semibold rounded-full">
                    {getCategoryEmoji(category)} {category}
                  </span>
                </>
              )}
            </div>

            {/* Share buttons */}
            <div className="mb-8">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                {tb('shareThisArticle', 'Share this article')}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {/* WhatsApp */}
                <a
                  href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-[#25D366] hover:bg-[#20bd5a] rounded-md transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12 2C6.477 2 2 6.477 2 12c0 2.038.552 3.94 1.511 5.584L2 22l4.416-1.511A9.952 9.952 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
                  WhatsApp
                </a>

                {/* LinkedIn */}
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-[#0A66C2] hover:bg-[#0958a8] rounded-md transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  LinkedIn
                </a>

                {/* X / Twitter */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-[#000000] hover:bg-[#333] rounded-md transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  X
                </a>

                {/* Facebook */}
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-[#1877F2] hover:bg-[#1666d9] rounded-md transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebook
                </a>

                {/* Telegram */}
                <a
                  href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-[#0088cc] hover:bg-[#0077b5] rounded-md transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  Telegram
                </a>

                {/* Email */}
                <a
                  href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-white bg-gray-100 hover:bg-gray-600 rounded-md transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email
                </a>

                {/* Copy link */}
                <CopyButton url={articleUrl} label={tb('shareThisArticle', 'Copy link')} />
              </div>
            </div>

            {/* Article content */}
            <div
              className="prose max-w-none
                prose-headings:font-bold prose-headings:text-[#1B365D]
                prose-a:text-[#2563EB] prose-a:no-underline hover:prose-a:underline
                prose-strong:text-[#1B365D] prose-strong:font-semibold
                prose-code:text-[#1B365D] prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-200
                prose-li:text-gray-700
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-6
                prose-ul:mb-6
                prose-hr:my-8
                prose-blockquote:border-l-4 prose-blockquote:border-[#D4AF37] prose-blockquote:bg-[#F4F6F9] prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:italic prose-blockquote:text-gray-600"
              dangerouslySetInnerHTML={{ __html: articleHtml }}
            />

            {/* References */}
            {references.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-200">
                <h2 className="text-xl font-bold text-[#1B365D] mb-4">
                  {tb('referencesHeading', 'References')}
                </h2>
                <ul className="space-y-2">
                  {references.map((ref, i) => (
                    <li key={i}>
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#2563EB] hover:underline"
                      >
                        {ref.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Author box */}
            <div className="mt-10 p-6 bg-[#F4F6F9] rounded-xl border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#1B365D] rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                  D
                </div>
                <div>
                  <p className="font-semibold text-[#1B365D]">{tb('author', 'David Zhang')}</p>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    {tb('authorBio', 'Regulatory compliance expert specializing in China market entry.')}
                  </p>
                  <a
                    href={href('/c/')}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#2563EB] hover:text-[#1d4ed8] mt-3 transition-colors"
                  >
                    {tb('relatedServiceCta', 'Get Free Assessment')} →
                  </a>
                </div>
              </div>
            </div>
          </article>

          {/* Right Column — Sidebar */}
          <aside className="w-full lg:w-72 xl:w-80 shrink-0">
            <div className="lg:sticky lg:top-24">
              {/* TOC */}
              {headings.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-[#1B365D] uppercase tracking-wider mb-3">
                    {tb('toc', 'Contents')}
                  </h3>
                  <nav>
                    <ul className="space-y-1.5">
                      {headings.map((h, i) => (
                        <li key={i}>
                          <a
                            href={`#${h.id}`}
                            className={`block text-sm transition-colors hover:text-[#2563EB] ${
                              h.level === 3 ? 'pl-4 text-gray-500' : 'text-gray-700 font-medium'
                            }`}
                          >
                            {h.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              )}

              {/* CTA card */}
              <div className="mt-6 bg-[#1B365D] rounded-xl p-6 text-white">
                <h3 className="font-bold text-lg mb-2">
                  {tb('relatedServiceLabel', 'Need Help With This?')}
                </h3>
                <p className="text-white/70 text-sm mb-4 leading-relaxed">
                  {tb('ctaSubtitle', 'Get a free compliance assessment from our expert team.')}
                </p>
                <a
                  href={href('/c/')}
                  className="block w-full text-center bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#1B365D] font-bold px-4 py-2.5 rounded-md transition-all text-sm"
                >
                  {tb('ctaButton', 'Get Free Assessment')}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Related Articles */}
      {relatedPosts.length > 0 && (
        <section className="bg-white border-t border-gray-200 py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-[#1B365D] mb-2">
              {tb('relatedArticles', 'Related Articles')}
            </h2>
            <p className="text-gray-500 mb-8">
              {tb('relatedArticlesDesc', 'Explore more insights on this topic')}
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((post) => (
                <a
                  key={post.slug}
                  href={`/${locale}/${post.slug}/`}
                  className="group bg-[#F4F6F9] rounded-xl p-6 hover:shadow-md transition-all border border-gray-100"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-400">
                      {post.readTime} {tb('readTime', 'min read')}
                    </span>
                    {post.category && (
                      <span className="text-xs px-2 py-0.5 bg-[#1B365D]/5 text-[#1B365D] rounded-full">
                        {post.category}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-[#1B365D] group-hover:text-[#2563EB] transition-colors mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {post.excerpt}
                    </p>
                  )}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
