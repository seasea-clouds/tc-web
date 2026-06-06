'use client';

import { useState } from 'react';
import Navbar from './Navbar';
import MobileTabBar from './MobileTabBar';
import SearchModal from './SearchModal';
import { defaultSearch } from './search';
import type { SearchFn } from './SearchModal';
import type { SearchResultItem } from './SearchModal';

export { type SearchFn, type SearchResultItem };

interface SearchProviderProps {
  searchFn?: SearchFn;
  freeCheckHref?: string;
  blogHref?: string;
  locale?: string;
  industries?: { slug: string; emoji: string }[];
  loginHref?: string;
}

export default function SearchProvider(props: SearchProviderProps) {
  const { searchFn = defaultSearch, ...navbarProps } = props;
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header>
        <Navbar
          {...navbarProps}
          onSearchOpen={() => setSearchOpen(true)}
        />
      </header>
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        searchFn={searchFn}
      />
      <MobileTabBar />
    </>
  );
}
