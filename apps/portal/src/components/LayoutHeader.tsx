'use client';

import { useLocale } from 'next-intl';
import Navbar from '@/components/Header';

export default function LayoutHeader() {
  const locale = useLocale();
  return (
    <Navbar
      onSearchOpen={() => {}}
      locale={locale}
      blogHref={`https://trade-web-site.pages.dev/{locale}/blog/`}
    />
  );
}
