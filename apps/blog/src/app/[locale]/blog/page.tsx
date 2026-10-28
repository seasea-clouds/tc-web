import { WHATSAPP_URL, LOCALES, SITE_URL, buildLanguages, sharedOpenGraph, sharedTwitter, AutoBreadcrumb, ComplianceForm } from '@trade/ui';
import fs from 'fs';
import path from 'path';
import { getPosts } from '@/lib/posts';
import { getMessages } from '@/lib/messages';
import BlogClient from './BlogClient';
import BlogPager from '@/components/BlogPager';
import { paginate, getCategories, categoryKey } from '@/lib/blog-list';



export async function generateStaticParams() {
  return LOCALES.map(l => ({ locale: l }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const msgs = getMessages(locale);
  const B = msgs?.Blog || {};
  const title = B.metaTitle || 'Exporting to China Blog';
  const description = B.metaDescription || 'Expert guides on exporting to China.';
  const path = '/blog/';
  const url = `https://sinotradecompliance.com/${locale}${path}`;
  return {
    title,
    description,
    openGraph: sharedOpenGraph({ title, description, locale, url }),
    twitter: sharedTwitter({ title, description }),
    alternates: {
      canonical: url,
      languages: buildLanguages(locale, [...LOCALES], `${path}`),
    },
  };
}

export default async function BlogHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const posts = getPosts(locale);
  const pages = paginate(posts);
  const categories = getCategories(posts);
  const msgs = getMessages(locale);
  const B = msgs?.Blog || {};
  const tb = (key: string, fb?: string) => B[key] ?? fb ?? key;
  const CF = msgs?.ContactForm || {};
  const cf = (key: string, fb?: string) => (msgs?.ContactForm?.[key] ?? fb ?? key);

  const readTimeText = tb('readTime', 'min read');
  const href = (p: string) => `/${locale}${p}`;

  // Build a map from raw category → translated label
  const categoryLabels: Record<string, string> = {};
  for (const cat of categories) {
    const key = categoryKey(cat);
    categoryLabels[cat] = tb(key, cat);
  }

  return (
    <>
      <AutoBreadcrumb locale={locale} />
      {/* Blog schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: tb('title', 'Insights & Compliance Guides'),
            description: tb('subtitle', 'Expert articles on taking your product to China: market entry, registration, labeling and certification.'),
            url: `${SITE_URL}/${locale}/blog/`,
            publisher: { '@type': 'Organization', name: 'SinoTrade Compliance', url: 'https://sinotradecompliance.com' },
          }),
        }}
      />

      {/* Hero */}
      <section className="py-16 bg-primary-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            {tb('title', 'Insights & Compliance Guides')}
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto">
            {tb('subtitle', 'Expert articles on taking your product to China: market entry, registration, labeling and certification.')}
          </p>
        </div>
      </section>

      {/* Posts */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <BlogClient
            pagePosts={pages[0] ?? []}
            allPosts={posts}
            categories={categories}
            categoryLabels={categoryLabels}
            locale={locale}
            readMoreText={tb('readMore', 'Read More')}
            readTimeText={readTimeText}
            noPostsText={tb('noPosts', 'No posts found.')}
            allText={tb('all', 'All')}
          />
          <BlogPager
            locale={locale}
            currentPage={1}
            totalPages={pages.length}
            paginationText={tb('pagination', 'Page')}
            prevText={tb('prev', 'Previous')}
            nextText={tb('next', 'Next')}
          />
        </div>
      </section>

      {/* Contact Form */}
      <ComplianceForm
        locale={locale}
        subject={`🔥 New Inquiry — SinoTrade Blog List`}
        fromName="SinoTrade Website"
        idPrefix="blog-list"
        texts={{
          title: cf('title', "Free Compliance Assessment"),
          subtitle: cf('subtitle', "Tell us about your products and we'll provide a personalized compliance roadmap."),
          emailLabel: cf('emailLabel', "Business Email"),
          emailPlaceholder: cf('emailPlaceholder', "you@company.com"),
          messageLabel: cf('messageLabel', "Message (optional)"),
          messagePlaceholder: cf('messagePlaceholder', "Describe your products or compliance needs..."),
          button: cf('button', "Submit Free Assessment"),
          privacy: cf('privacy', "We respect your privacy. No spam, ever."),
        }}
      />

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
