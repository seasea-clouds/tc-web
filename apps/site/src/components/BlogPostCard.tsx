import Link from 'next/link';
import type { BlogPostMeta } from '@/lib/blog';

type BlogPostCardProps = {
  post: BlogPostMeta;
  readMoreText: string;
  readTimeText: string;
};

export default function BlogPostCard({ post, readMoreText, readTimeText }: BlogPostCardProps) {
  const href = `/${post.locale}/blog/${post.slug}/`;

  return (
    <Link href={href} className="group flex flex-col bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden no-underline text-inherit">
      <div className="flex flex-col flex-1 p-5">
        {/* Title */}
        <h3 className="text-lg font-bold text-[#333333] mb-2 line-clamp-2 group-hover:text-primary-navy transition-colors">
          {post.title}
        </h3>

        {/* Excerpt */}
        <p className="text-[#5F6F7F] text-sm mb-4 line-clamp-3 flex-1">
          {post.excerpt}
        </p>

        {/* Date + Read Time + Category + Read More */}
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
    </Link>
  );
}
