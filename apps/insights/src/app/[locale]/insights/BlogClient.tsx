'use client';

import { useMemo, useState } from 'react';
import type { PostMeta } from '@/lib/posts';
import BlogRows, { type BlogCardTexts } from '@/components/BlogRows';

interface Props {
  /** Posts of the page being viewed (server-rendered page 1, or the current page). */
  pagePosts: PostMeta[];
  /** Every post, used only when a category filter is active. */
  allPosts: PostMeta[];
  categories: string[];
  categoryLabels: Record<string, string>;
  locale: string;
  readMoreText: string;
  readTimeText: string;
  noPostsText: string;
  allText: string;
}

export default function BlogClient({
  pagePosts, allPosts, categories, categoryLabels, locale,
  readMoreText, readTimeText, noPostsText, allText,
}: Props) {
  const [category, setCategory] = useState<string | null>(null);
  const texts: BlogCardTexts = { locale, readMoreText, readTimeText, categoryLabels };

  const visible = useMemo(
    () => (category ? allPosts.filter(p => p.category === category) : pagePosts),
    [category, allPosts, pagePosts],
  );

  return (
    <>
      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setCategory(null)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              category === null ? 'bg-[#B8960C] text-white' : 'bg-[#F4F6F9] text-[#333333] hover:bg-primary-navy/10'
            }`}
          >
            {allText}
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                category === cat ? 'bg-[#B8960C] text-white' : 'bg-[#F4F6F9] text-[#333333] hover:bg-primary-navy/10'
              }`}
            >
              {categoryLabels[cat] || cat}
            </button>
          ))}
        </div>
      )}

      {visible.length > 0 ? (
        <BlogRows posts={visible} texts={texts} />
      ) : (
        <p className="py-16 text-center text-[#5F6F7F]">{noPostsText}</p>
      )}
    </>
  );
}
