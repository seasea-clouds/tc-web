import { LOCALES, buildLanguages, sharedOpenGraph, sharedTwitter, AutoBreadcrumb } from '@trade/ui';
import { getDocuments } from '@/lib/documents';
import { getMessages } from '@/lib/messages';
import { paginate } from '@/lib/doc-list';
import RegulationRows from '@/components/RegulationRows';
import RegulationPager from '@/components/RegulationPager';

interface Params {
  locale: string;
  page: string;
}

/**
 * Deep list pages. Page 1 lives at /{locale}/regulations/; every further page gets its
 * own indexable URL (/regulations/page/2/, /regulations/page/3/ …) with a self-referencing
 * canonical and its own hreflang cluster. The set of posts on a given URL can
 * shift when new articles are published — that is normal for pagination and is
 * why every article keeps its own permanent URL at /regulations/<slug>/.
 */
export async function generateStaticParams() {
  const params: Params[] = [];
  for (const locale of LOCALES) {
    const pages = paginate(getDocuments(locale));
    // Page 1 is listed at /{locale}/regulations/ too; its /page/1/ copy carries a
    // canonical pointing back there. Generating it keeps the dynamic route
    // non-empty for `output: export` even when there is a single page.
    for (let n = 1; n <= pages.length; n += 1) {
      params.push({ locale, page: String(n) });
    }
  }
  return params;
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale, page } = await params;
  const msgs = getMessages(locale);
  const B = msgs?.Regulations || {};
  const tb = (key: string, fallback?: string) => B[key] ?? fallback ?? key;
  const path = `/regulations/page/${page}/`;
  const url = `https://sinotradecompliance.com/${locale}${path}`;
  const canonical = page === '1' ? `https://sinotradecompliance.com/${locale}/regulations/` : url;
  // Page 1 duplicates /regulations/, so its hreflang cluster points there too.
  const langPath = page === '1' ? '/regulations/' : path;
  const title = page === '1'
    ? tb('metaTitle', 'China Regulations & GACC Decrees')
    : `${tb('metaTitle', 'China Regulations & GACC Decrees')} — ${tb('pagination', 'Page')} ${page}`;
  const description = tb('metaDescription', 'Official Chinese customs and regulatory documents for exporters.');
  return {
    title,
    description,
    // og:url 与 canonical 保持一致（page/1 归并到 /regulations/），避免分享统计被拆成两个 URL
    openGraph: sharedOpenGraph({ title, description, locale, url: canonical }),
    twitter: sharedTwitter({ title, description }),
    alternates: {
      canonical,
      languages: buildLanguages(locale, [...LOCALES], langPath),
    },
  };
}

export default async function RegulationsPageN({ params }: { params: Promise<Params> }) {
  const { locale, page } = await params;
  const pageNumber = Number(page);
  const docs = getDocuments(locale);
  const pages = paginate(docs);
  const pageDocs = pages[pageNumber - 1] ?? [];
  const msgs = getMessages(locale);
  const B = msgs?.Regulations || {};
  const tb = (key: string, fallback?: string) => B[key] ?? fallback ?? key;

  const statusLabels: Record<string, string> = {
    in_force: tb('statusInForce', 'In force'),
    upcoming: tb('statusUpcoming', 'Not yet in force'),
    amended: tb('statusAmended', 'Amended'),
    repealed: tb('statusRepealed', 'Repealed'),
    draft: tb('statusDraft', 'Draft'),
  };
  const texts = {
    colDocNumber: tb('colDocNumber', 'Document No.'),
    colTitle: tb('colTitle', 'Title'),
    colPublished: tb('colPublished', 'Published'),
    colEffective: tb('colEffective', 'In force'),
    colStatus: tb('colStatus', 'Status'),
    noDocs: tb('noDocs', 'No documents yet.'),
    statusLabels,
  };

  const pageLabel = `${tb('pagination', 'Page')} ${pageNumber}`;
  const canonical = pageNumber === 1
    ? `https://sinotradecompliance.com/${locale}/regulations/`
    : `https://sinotradecompliance.com/${locale}/regulations/page/${pageNumber}/`;

  return (
    <>
      <AutoBreadcrumb locale={locale} title={pageLabel} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: pageLabel,
            url: canonical,
            inLanguage: locale,
            isPartOf: {
              '@type': 'CollectionPage',
              name: tb('title', 'China Regulations & GACC Decrees'),
              url: `https://sinotradecompliance.com/${locale}/regulations/`,
            },
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: pageDocs.length,
              itemListOrder: 'https://schema.org/ItemListOrderDescending',
              itemListElement: pageDocs.map((post, idx) => ({
                '@type': 'ListItem',
                position: idx + 1,
                // ListItem.item 用 URL 字符串即可（也吃检查器的必填字段规则）
                item: `https://sinotradecompliance.com/${locale}/regulations/${post.slug}/`,
                name: post.title,
              })),
            },
          }),
        }}
      />
      <section className="bg-primary-navy py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="mb-6 text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            {tb('title', 'China Regulations & GACC Decrees')}
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-white/80 md:text-xl">
            {tb('subtitle', 'Official Chinese customs and regulatory documents for exporters, tracked and summarised.')}
          </p>
          {pageNumber > 1 && (
            <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-[#B8960C]">{pageLabel}</p>
          )}
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RegulationRows docs={pageDocs} locale={locale} texts={texts} />
          <RegulationPager
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
