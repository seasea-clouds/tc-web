import { LOCALES, buildLanguages, sharedOpenGraph, sharedTwitter } from '@trade/ui';
import { getPosts } from '@/lib/posts';
import { getMessages } from '@/lib/messages';
import { paginate, getCategories, categoryKey } from '@/lib/blog-list';
import BlogRows, { type BlogCardTexts } from '@/components/BlogRows';
import BlogPager from '@/components/BlogPager';

interface Params {
  locale: string;
  page: string;
}

/**
 * Deep list pages. Page 1 lives at /{locale}/blog/; every further page gets its
 * own indexable URL (/blog/page/2/, /blog/page/3/ …) with a self-referencing
 * canonical and its own hreflang cluster. The set of posts on a given URL can
 * shift when new articles are published — that is normal for pagination and is
 * why every article keeps its own permanent URL at /blog/<slug>/.
 */
export async function generateStaticParams() {
  const params: Params[] = [];
  for (const locale of LOCALES) {
    const pages = paginate(getPosts(locale));
    // Page 1 is listed at /{locale}/blog/ too; its /page/1/ copy carries a
    // canonical pointing back there. Generating it keeps the dynamic route
    // non-empty for `output: export` even when the blog has a single page.
    for (let n = 1; n <= pages.length; n += 1) {
      params.push({ locale, page: String(n) });
    }
  }
  return params;
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale, page } = await params;
  const msgs = getMessages(locale);
  const B = msgs?.Blog || {};
  const tb = (key: string, fallback?: string) => B[key] ?? fallback ?? key;
  const path = `/blog/page/${page}/`;
  const url = `https://sinotradecompliance.com/${locale}${path}`;
  const canonical = page === '1' ? `https://sinotradecompliance.com/${locale}/blog/` : url;
  // Page 1 duplicates /blog/, so its hreflang cluster points there too.
  const langPath = page === '1' ? '/blog/' : path;
  const title = page === '1'
    ? tb('metaTitle', 'Exporting to China Blog')
    : `${tb('metaTitle', 'Exporting to China Blog')} — ${tb('pagination', 'Page')} ${page}`;
  const description = tb('metaDescription', 'Expert guides on exporting to China.');
  return {
    title,
    description,
    openGraph: sharedOpenGraph({ title, description, locale, url }),
    twitter: sharedTwitter({ title, description }),
    alternates: {
      canonical,
      languages: buildLanguages(locale, [...LOCALES], langPath),
    },
  };
}

export default async function BlogPageN({ params }: { params: Promise<Params> }) {
  const { locale, page } = await params;
  const pageNumber = Number(page);
  const posts = getPosts(locale);
  const pages = paginate(posts);
  const pagePosts = pages[pageNumber - 1] ?? [];
  const msgs = getMessages(locale);
  const B = msgs?.Blog || {};
  const tb = (key: string, fallback?: string) => B[key] ?? fallback ?? key;

  const categoryLabels: Record<string, string> = {};
  for (const cat of getCategories(posts)) {
    categoryLabels[cat] = tb(categoryKey(cat), cat);
  }
  const texts: BlogCardTexts = {
    locale,
    readMoreText: tb('readMore', 'Read More'),
    readTimeText: tb('readTime', 'min read'),
    categoryLabels,
  };

  return (
    <>
      <section className="bg-primary-navy py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="mb-6 text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            {tb('title', 'Insights & Compliance Guides')}
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-white/80 md:text-xl">
            {tb('subtitle', 'Expert articles on taking your product to China: market entry, registration, labeling and certification.')}
          </p>
          {pageNumber > 1 && (
            <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-[#B8960C]">
              {tb('pagination', 'Page')} {pageNumber}
            </p>
          )}
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {pagePosts.length > 0 ? (
            <BlogRows posts={pagePosts} texts={texts} />
          ) : (
            <p className="py-16 text-center text-[#5F6F7F]">{tb('noPosts', 'No posts found.')}</p>
          )}
          <BlogPager
            locale={locale}
            currentPage={pageNumber}
            totalPages={pages.length}
            paginationText={tb('pagination', 'Page')}
            prevText={tb('prev', 'Previous')}
            nextText={tb('next', 'Next')}
          />
        </div>
      </section>
    </>
  );
}
