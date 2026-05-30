import { getTranslations } from 'next-intl/server';
import { getPostsByCategory } from '@/lib/blog';
import Link from 'next/link';

type RelatedResourcesProps = {
  locale: string;
  category: string;
};

export default async function RelatedResources({ locale, category }: RelatedResourcesProps) {
  const t = await getTranslations({ locale, namespace: 'ServiceCommon' });
  const blogT = await getTranslations({ locale, namespace: 'Blog' });
  const posts = getPostsByCategory(locale, category)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  if (posts.length === 0) return null;

  return (
    <section className="py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-[#1B365D] mb-2">{t('relatedResourcesTitle')}</h2>
        <p className="text-[#5F6F7F] mb-8">{t('relatedResourcesSubtitle')}</p>
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/${post.locale}/blog/${post.slug}/`}
                className="group flex items-start gap-4 p-4 rounded-xl hover:bg-[#F4F6F9] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-[#1B365D] group-hover:text-[#B8960C] transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[#5F6F7F]">
                    <span className="px-2 py-0.5 bg-primary-navy/10 rounded-full text-[#1B365D]">
                      {post.category}
                    </span>
                    <time dateTime={post.date}>{post.date}</time>
                    <span>{post.readTime} {blogT('readTime')}</span>
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
    </section>
  );
}
