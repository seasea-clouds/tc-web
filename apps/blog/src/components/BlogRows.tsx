import type { PostMeta } from '@/lib/posts';
import { buildRows } from '@/lib/blog-list';

export interface BlogCardTexts {
  locale: string;
  readMoreText: string;
  readTimeText: string;
  categoryLabels: Record<string, string>;
}

function formatBlogDate(dateStr: string, locale: string): string {
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

function BlogCard({ post, locale, readMoreText, readTimeText, categoryLabels, heightClass = '' }: {
  post: PostMeta;
  heightClass?: string;
} & BlogCardTexts) {
  return (
    <a
      href={`/${locale}/blog/${post.slug}/`}
      className={`group relative flex flex-col bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden no-underline text-inherit ${heightClass}`}
    >
      {post.cover && (
        <div className="h-56 sm:h-64 lg:h-72 overflow-hidden bg-[#F4F6F9]">
          <img
            src={post.cover}
            alt={post.title}
            width={1200}
            height={630}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />
        </div>
      )}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="text-lg font-bold text-[#333333] mb-2 line-clamp-2 min-h-0 group-hover:text-primary-navy transition-colors">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-[#5F6F7F] text-sm mb-4 line-clamp-3 flex-1 min-h-0">
            {post.excerpt}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-3 border-t border-[#F4F6F9]">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#5F6F7F]">
            {post.date && <time dateTime={post.date}>{formatBlogDate(post.date, locale)}</time>}
            {post.date && <span>•</span>}
            <span>{post.readTime} {readTimeText}</span>
            <span>•</span>
            <span className="font-semibold text-primary-navy">{categoryLabels[post.category] || post.category}</span>
          </div>
          <span className="text-sm font-semibold text-[#B8960C] group-hover:text-[#1B365D] transition-colors">
            {readMoreText}
          </span>
        </div>
      </div>
    </a>
  );
}

/** Renders one page of posts as magazine rows. Pure component: usable on the server and in the client. */
export default function BlogRows({ posts, texts }: { posts: PostMeta[]; texts: BlogCardTexts }) {
  return (
    <div className="space-y-8">
      {buildRows(posts).map((row, ri) =>
        row.kind === 'feature' ? (
          <div key={`feature-${ri}`} className="grid gap-8 lg:grid-cols-2">
            <BlogCard key={row.big.slug} post={row.big} heightClass="lg:h-[512px]" {...texts} />
            <div className="grid gap-8 lg:grid-rows-2">
              {row.smalls.map(p => <BlogCard key={p.slug} post={p} heightClass="h-full" {...texts} />)}
            </div>
          </div>
        ) : (
          <div key={`plain-${ri}`} className="grid gap-8 lg:grid-cols-2">
            {row.posts.map(p => (
              <BlogCard
                key={p.slug}
                post={p}
                heightClass={p.cover ? 'lg:h-[512px]' : 'lg:h-[240px]'}
                {...texts}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
