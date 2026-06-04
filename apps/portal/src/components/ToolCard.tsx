'use client';

import Link from 'next/link';

interface ToolCardProps {
  icon: string;
  title: string;
  desc: string;
  href: string;
  badge?: 'free' | 'new' | 'popular';
}

export default function ToolCard({ icon, title, desc, href, badge }: ToolCardProps) {
  return (
    <Link
      href={href}
      className="group block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-gold/40 transition-all p-5 relative overflow-hidden"
    >
      {/* Free badge */}
      {badge === 'free' && (
        <span className="absolute top-3 right-3 bg-green-50 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
          Free
        </span>
      )}
      {badge === 'new' && (
        <span className="absolute top-3 right-3 bg-gold/10 text-gold text-xs font-medium px-2 py-0.5 rounded-full">
          New
        </span>
      )}

      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-primary-navy text-base mb-1.5 group-hover:text-gold transition-colors">
        {title}
      </h3>
      <p className="text-sm text-gray-500 mb-4 line-clamp-2">
        {desc}
      </p>

      <div className="flex items-center gap-1 text-sm text-gold font-medium group-hover:gap-2 transition-all">
        Free Check
        <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
      </div>
    </Link>
  );
}
