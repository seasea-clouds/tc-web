'use client';

import { useState } from 'react';
import Navbar from './Navbar';
import SearchModal from './SearchModal';
import MobileTabBar from './MobileTabBar';

const PORTAL_URL = 'https://trade-web-portal.pages.dev';
const BLOG_URL = 'https://trade-web-blog.pages.dev';

export default function SearchProvider() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header>
        <Navbar
          onSearchOpen={() => setSearchOpen(true)}
          freeCheckHref={`${PORTAL_URL}/{locale}/c`}
          blogHref={`${BLOG_URL}/{locale}/blog`}
        />
      </header>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileTabBar />
    </>
  );
}
