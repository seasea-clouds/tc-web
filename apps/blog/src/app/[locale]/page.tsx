import fs from 'fs';
import path from 'path';
import { getPosts } from '@/lib/posts';
import { getMessages } from '@/lib/messages';

const LOCALES = [
  'en','zh','es','fr','de','ja','pt','ru','ar','ko','it','nl','tr','vi','id','th',
  'hi','pl','sv','el','cs','ro','hu','fi','da','no','nb','uk','bg','hr','sr','sk',
  'sl','ms','ka','he','sw','bn','ca','fa','ur','ta','af','sq','az','hy','be','ne','si','tl','te',
];

export async function generateStaticParams() {
  return LOCALES.map(l => ({ locale: l }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const msgs = getMessages(locale);
  const B = msgs?.Blog || {};
  return {
    title: B.metaTitle || 'China Import Compliance Blog',
    description: B.metaDescription || 'Expert guides on China import compliance.',
    alternates: {
      canonical: `https://sinotradecompliance.com/${locale}/blog/`,
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

export default async function BlogHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const posts = getPosts(locale);
  const msgs = getMessages(locale);
  const B = msgs?.Blog || {};
  const tb = (key: string, fb?: string) => B[key] ?? fb ?? key;

  const href = (p: string) => `/${locale}${p}`;

  return (
    <>
      {/* Hero / Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="max-w-3xl">
            <a
              href={href('/')}
              className="inline-flex items-center gap-1 text-sm text-[#2563EB] hover:text-[#1d4ed8] font-medium mb-4 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {tb('backToHome', 'Back to Home')}
            </a>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1B365D] mb-4">
              {tb('title', 'Insights & Compliance Guides')}
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              {tb('subtitle', 'Expert articles on China import regulations, market entry, and compliance best practices.')}
            </p>
          </div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {posts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-gray-500 text-lg">{tb('noPosts', 'No posts found.')}</p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <a
                key={post.slug}
                href={`/${locale}/${post.slug}/`}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 overflow-hidden flex flex-col"
              >
                <div className="p-6 sm:p-7 flex flex-col flex-1">
                  {/* Category + read time */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-block px-2.5 py-0.5 bg-[#1B365D]/5 text-[#1B365D] text-xs font-semibold rounded-full">
                      {post.category}
                    </span>
                    <span className="text-xs text-gray-400">
                      {post.readTime} {tb('readTime', 'min read')}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-bold text-[#1B365D] mb-2 group-hover:text-[#2563EB] transition-colors leading-snug">
                    {post.title}
                  </h2>

                  {/* Excerpt */}
                  {post.excerpt && (
                    <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}

                  <div className="flex-1" />

                  {/* Date + Read More */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <time className="text-xs text-gray-400">
                      {formatDate(post.date, locale)}
                    </time>
                    <span className="text-sm font-medium text-[#2563EB] group-hover:text-[#1d4ed8] transition-colors">
                      {tb('readMore', 'Read More')} →
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-[#1B365D] py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            {tb('ctaTitle', 'Need Help with China Compliance?')}
          </h2>
          <p className="text-white/70 mb-8 text-lg">
            {tb('ctaSubtitle', 'Get a free compliance assessment from our expert team.')}
          </p>
          <a
            href={href('/c/')}
            className="inline-flex items-center bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#1B365D] font-bold px-8 py-3 rounded-md transition-all hover:shadow-lg text-lg"
          >
            {tb('ctaButton', 'Get Free Assessment')}
          </a>
        </div>
      </section>
    </>
  );
}
