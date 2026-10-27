'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';

/**
 * Root locale page — client-side redirect to /regulations/
 * The regulations app's content lives at /[locale]/regulations/.
 */
export default function RootRedirect() {
  const params = useParams();
  const locale = params.locale as string;

  useEffect(() => {
    if (locale) {
      window.location.replace(`/${locale}/regulations/`);
    }
  }, [locale]);

  return null;
}
