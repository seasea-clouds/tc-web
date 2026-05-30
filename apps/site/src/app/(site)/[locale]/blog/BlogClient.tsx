'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { BlogPostMeta } from '@/lib/blog';
import BlogPostCard from '@/components/BlogPostCard';
import BlogCategoryFilter from '@/components/BlogCategoryFilter';

export default function BlogClient({
  posts,
  categories,
}: {
  posts: BlogPostMeta[];
  categories: string[];
}) {
  const t = useTranslations('Blog');
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);

  const filtered = currentCategory
    ? posts.filter((p) => p.category === currentCategory)
    : posts;

  return (
    <>
      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="mb-8">
          <BlogCategoryFilter
            categories={categories}
            currentCategory={currentCategory}
            onCategoryChange={setCurrentCategory}
            allText={t('all')}
          />
        </div>
      )}

      {/* Posts Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((post) => (
            <BlogPostCard key={post.slug} post={post} readMoreText={t('readMore')} readTimeText={t('readTime')} />
          ))}
        </div>
      ) : (
        <p className="text-center text-[#5F6F7F] py-16">
          {t('noPosts')}
        </p>
      )}
    </>
  );
}
