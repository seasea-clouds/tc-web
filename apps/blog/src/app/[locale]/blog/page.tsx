import { WHATSAPP_URL, LOCALES, SITE_URL } from '@trade/ui';
import fs from 'fs';
import path from 'path';
import { getPosts } from '@/lib/posts';
import { getMessages } from '@/lib/messages';
import BlogClient from './BlogClient';



export async function generateStaticParams() {
  return LOCALES.map(l => ({ locale: l }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const msgs = getMessages(locale);
  const B = msgs?.Blog || {};
  const title = B.metaTitle || 'China Import Compliance Blog';
  const description = B.metaDescription || 'Expert guides on China import compliance.';
  const path = '/blog/';
  return {
    title,
    description,
    alternates: {
      canonical: `https://sinotradecompliance.com/${locale}${path}`,
    },
  };
}

function getCategories(posts: { category: string }[]): string[] {
  const cats = new Set<string>();
  for (const p of posts) {
    if (p.category) cats.add(p.category);
  }
  return [...cats].sort();
}

export default async function BlogHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const posts = getPosts(locale);
  const categories = getCategories(posts);
  const msgs = getMessages(locale);
  const B = msgs?.Blog || {};
  const tb = (key: string, fb?: string) => B[key] ?? fb ?? key;
  const N = msgs?.Navbar || {};
  const Bc = msgs?.breadcrumb || {};
  const bc = (key: string, fb?: string) => Bc[key] ?? fb ?? key;

  const href = (p: string) => `/${locale}${p}`;
  const readTimeText = tb('readTime', 'min read');

  // Breadcrumb structured data
  const breadcrumbJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/${locale}/` },
    ],
  });

  return (
    <>
      {/* Blog schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: tb('title', 'Insights & Compliance Guides'),
            description: tb('subtitle', 'Expert articles on China import regulations, market entry, and compliance best practices.'),
            url: `${SITE_URL}/${locale}/blog/`,
            publisher: { '@type': 'Organization', name: 'SinoTrade Compliance', url: 'https://sinotradecompliance.com' },
          }),
        }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <ol className="flex items-center gap-1.5 text-sm text-text-muted flex-wrap">
          <li className="flex items-center gap-1.5">
            <a className="hover:text-primary-navy transition-colors truncate max-w-[200px] sm:max-w-none" href={href('/')}>
              {N.home || 'Home'}
            </a>
          </li>
          <li className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0 text-text-muted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-text-charcoal font-medium truncate max-w-[200px] sm:max-w-none">
              {bc('blog', 'Blog')}
            </span>
          </li>
        </ol>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />
      </nav>

      {/* Hero */}
      <section className="py-16 bg-primary-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            {tb('title', 'Insights & Compliance Guides')}
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto">
            {tb('subtitle', 'Expert articles on China import regulations, market entry, and compliance best practices.')}
          </p>
        </div>
      </section>

      {/* Posts */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <BlogClient
            posts={posts}
            categories={categories}
            locale={locale}
            readMoreText={tb('readMore', 'Read More')}
            readTimeText={readTimeText}
            noPostsText={tb('noPosts', 'No posts found.')}
            allText={tb('all', 'All')}
          />
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16 bg-[#F4F6F9]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#333333] mb-3 text-center">
            {tb('contactTitle', 'Free Compliance Assessment')}
          </h2>
          <p className="text-[#5F6F7F] mb-8 leading-relaxed">
            {tb('contactDesc', 'Tell us about your products and we\u2019ll provide a personalized compliance roadmap.')}
          </p>
          <form className="w-full max-w-md mx-auto bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-sm" action="https://api.web3forms.com/submit" method="POST">
            <input type="hidden" name="access_key" value="b1e6d34d-9fdc-4dc1-9bb2-6fc9090b361c" />
            <input type="hidden" name="subject" value="🔥 New Inquiry — SinoTrade Website" />
            <input type="hidden" name="from_name" value="SinoTrade Website" />
            <input type="checkbox" className="hidden" style={{ display: 'none' }} name="botcheck" />
            <input type="hidden" name="redirect" value={`${SITE_URL}/${locale}/thank-you`} />
            <div className="mb-4 relative">
              <label htmlFor="email" className="block text-sm font-semibold text-[#333333] mb-1 text-left">{tb('contactEmail', 'Business Email')}</label>
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5F6F7F]" aria-hidden="true"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"></path><rect x="2" y="4" width="20" height="16" rx="2"></rect></svg>
                <input type="email" id="email" placeholder={tb('contactEmailPlaceholder', 'you@company.com')} required className="w-full pl-10 pr-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1B365D] focus:border-transparent transition-all shadow-sm text-[#333333]" name="email" />
              </div>
            </div>
            <div className="mb-4 relative">
              <label htmlFor="message" className="block text-sm font-semibold text-[#333333] mb-1 text-left">{tb('contactMessage', 'Message (optional)')}</label>
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square absolute left-3 top-3.5 w-5 h-5 text-[#5F6F7F]" aria-hidden="true"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"></path></svg>
                <textarea name="message" id="message" rows={3} placeholder={tb('contactMessagePlaceholder', 'Describe your products or compliance needs...')} className="w-full pl-10 pr-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1B365D] focus:border-transparent transition-all shadow-sm text-[#333333]" />
              </div>
            </div>
            <button type="submit" className="w-full mt-2 bg-gold hover:bg-gold/90 text-primary-navy font-bold py-3.5 px-4 rounded-lg transition-all duration-300 shadow-md flex justify-center items-center gap-2">
              {tb('contactSubmit', 'Submit Free Assessment')}
            </button>
            <p className="text-xs text-[#5F6F7F] text-center mt-3">{tb('contactPrivacy', 'We respect your privacy. No spam, ever.')}</p>
          </form>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary-navy">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {tb('ctaTitle', 'Need This Service?')}
          </h2>
          <p className="text-white/80 mb-2">
            {tb('ctaDesc', 'Get a free compliance assessment tailored to your products.')}
          </p>
          <p className="text-[#B8960C] text-sm font-medium mb-6">
            {tb('ctaResponse', 'Free consultation → 24h response')}
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-accent-gold hover:bg-accent-gold/90 text-white font-semibold px-8 py-3 rounded-md transition-all hover:shadow-lg"
          >
            {tb('ctaButton', 'Get Free Assessment')}
          </a>
        </div>
      </section>
    </>
  );
}
