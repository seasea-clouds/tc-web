'use client';

import { useLocale } from 'next-intl';
import { Navbar } from '@trade/ui';

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
