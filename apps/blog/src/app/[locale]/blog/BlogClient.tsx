'use client';

import { useState } from 'react';
import type { PostMeta } from '@/lib/posts';

interface Props {
  posts: PostMeta[];
  categories: string[];
  categoryLabels: Record<string, string>;
  locale: string;
  readMoreText: string;
  readTimeText: string;
  noPostsText: string;
  allText: string;
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

type ListRow =
  | { kind: 'feature'; big: PostMeta; smalls: PostMeta[] }
  | { kind: 'plain'; posts: PostMeta[] };

/**
 * Magazine flow: a post with a cover gets a wide card, and exactly two cover-less
 * posts fill the column beside it, so every row ends flush instead of leaving one
 * card taller than its neighbour. Everything else is paired two by two.
 */
function buildRows(posts: PostMeta[]): ListRow[] {
  const pool = [...posts];
  const rows: ListRow[] = [];
  while (pool.length > 0) {
    const head = pool[0];
    if (head.cover) {
      // Pairing only works with two cover-less cards: a lone card in a half-row
      // would just be stretched to the tall card's height and read as an empty box.
      const spare: number[] = [];
      for (let k = 1; k < pool.length && spare.length < 2; k += 1) {
        if (!pool[k].cover) spare.push(k);
      }
      if (spare.length === 2) {
        const smalls = spare.map(k => pool[k]);
        for (let j = spare.length - 1; j >= 0; j -= 1) pool.splice(spare[j], 1);
        pool.shift();
        rows.push({ kind: 'feature', big: head, smalls });
      } else {
        pool.shift();
        const next = pool.shift();
        rows.push({ kind: 'plain', posts: next ? [head, next] : [head] });
      }
    } else {
      rows.push({ kind: 'plain', posts: pool.splice(0, 2) });
    }
  }
  return rows;
}

interface CardProps {
  post: PostMeta;
  locale: string;
  readMoreText: string;
  readTimeText: string;
  categoryLabels: Record<string, string>;
  /** Height is pinned per row on desktop so the grid reads as a brick wall. */
  heightClass?: string;
}

function BlogCard({ post, locale, readMoreText, readTimeText, categoryLabels, heightClass = '' }: CardProps) {
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

export default function BlogClient({ posts, categories, categoryLabels, locale, readMoreText, readTimeText, noPostsText, allText }: Props) {
  const [category, setCategory] = useState<string | null>(null);
  const filtered = category ? posts.filter(p => p.category === category) : posts;
  const cardProps = { locale, readMoreText, readTimeText, categoryLabels };

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
              {categoryLabels[cat] || cat}
            </button>
          ))}
        </div>
      )}

      {/* Posts — magazine rows, every row ends flush */}
      {filtered.length > 0 ? (
        <div className="space-y-8">
          {buildRows(filtered).map((row, ri) =>
            row.kind === 'feature' ? (
              <div key={`feature-${ri}`} className="grid gap-8 lg:grid-cols-2">
                <BlogCard key={row.big.slug} post={row.big} heightClass="lg:h-[512px]" {...cardProps} />
                <div className="grid gap-8 lg:grid-rows-2">
                  {row.smalls.map(p => <BlogCard key={p.slug} post={p} heightClass="h-full" {...cardProps} />)}
                </div>
              </div>
            ) : (
              <div key={`plain-${ri}`} className="grid gap-8 lg:grid-cols-2">
                {row.posts.map(p => <BlogCard key={p.slug} post={p} heightClass="lg:h-[240px]" {...cardProps} />)}
              </div>
            )
          )}
        </div>
      ) : (
        <p className="text-[#5F6F7F] text-center py-16">{noPostsText}</p>
      )}
    </>
  );
}
