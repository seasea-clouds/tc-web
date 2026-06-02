'use client';

import { Home, Grid3X3, BookOpen, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useT, useTradeLocale } from './TranslationProvider';
import { WHATSAPP_URL } from './constants';

const TAB_HREFS = {
  home: '/',
  services: '/services',
  blog: '/blog',
  contact: WHATSAPP_URL,
} as const;

export default function MobileTabBar() {
  const pathname = usePathname();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';
  const t = useT('MobileTab');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white border-t border-gray-200 shadow-lg safe-area-bottom" role="navigation" aria-label="Mobile navigation">
      <div className="flex items-center justify-around h-16">
        {(Object.entries(TAB_HREFS) as [keyof typeof TAB_HREFS, string][]).map(([key, href]) => {
          const label = t(key);
          const icons: Record<string, React.ElementType> = {
            home: Home,
            services: Grid3X3,
            blog: BookOpen,
            contact: MessageCircle,
          };
          const Icon = icons[key];
          const isExternal = key === 'contact';
          const isActive = isExternal
            ? false
            : pathname === href || (href !== '/' && pathname.startsWith(href));

          if (isExternal) {
            return (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[#5F6F7F] active:bg-bg-ice transition-colors"
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </a>
            );
          }

          return (
            <Link
              key={key}
              href={href === '/' ? `/${locale}` : `/${locale}${href}`}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive
                  ? 'text-[#B8960C]'
                  : 'text-[#5F6F7F] active:bg-bg-ice'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
