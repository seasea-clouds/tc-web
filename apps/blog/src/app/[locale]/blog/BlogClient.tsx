'use client';

import { useState } from 'react';
import type { PostMeta } from '@/lib/posts';

interface Props {
  posts: PostMeta[];
  categories: string[];
  locale: string;
  readMoreText: string;
  readTimeText: string;
  noPostsText: string;
  allText: string;
}

export default function BlogClient({ posts, categories, locale, readMoreText, readTimeText, noPostsText, allText }: Props) {
  const [category, setCategory] = useState<string | null>(null);
  const filtered = category ? posts.filter(p => p.category === category) : posts;

  return (
    <>
      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setCategory(null)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              category === null ? 'bg-[#B8960C] text-white' : 'bg-[#F4F6F9] text-[#333333] hover:bg-primary-navy/10'
            }`}
          >
            {allText}
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                category === cat ? 'bg-[#B8960C] text-white' : 'bg-[#F4F6F9] text-[#333333] hover:bg-primary-navy/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Posts Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(post => (
            <a
              key={post.slug}
              href={`/${locale}/blog/${post.slug}/`}
              className="group flex flex-col bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden no-underline text-inherit"
            >
              <div className="flex flex-col flex-1 p-5">
                <h3 className="text-lg font-bold text-[#333333] mb-2 line-clamp-2 group-hover:text-primary-navy transition-colors">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="text-[#5F6F7F] text-sm mb-4 line-clamp-3 flex-1">
                    {post.excerpt}
                  </p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-[#F4F6F9]">
                  <div className="flex items-center gap-2 text-xs text-[#5F6F7F]">
                    <span>{post.readTime} {readTimeText}</span>
                    <span>•</span>
                    <span className="font-semibold text-primary-navy">{post.category}</span>
                  </div>
                  <span className="text-sm font-semibold text-[#B8960C] group-hover:text-[#1B365D] transition-colors">
                    {readMoreText}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <p className="text-[#5F6F7F] text-center py-16">{noPostsText}</p>
      )}
    </>
  );
}
