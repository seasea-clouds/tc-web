'use client';

import { useLocale } from 'next-intl';
import Navbar from '@/components/Header';

export default function LayoutHeader() {
  const locale = useLocale();
  return (
    <Navbar
      onSearchOpen={() => {}}
      locale={locale}
      blogHref={`/{locale}/blog/`}
    />
  );
}
