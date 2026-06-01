'use client';

import { useState } from 'react';
import { Navbar } from '@trade/ui';
import SearchModal from './SearchModal';
import MobileTabBar from './MobileTabBar';

export default function SearchProvider() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header>
        <Navbar onSearchOpen={() => setSearchOpen(true)} />
      </header>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileTabBar />
    </>
  );
}
