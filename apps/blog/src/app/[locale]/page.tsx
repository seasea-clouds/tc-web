'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';

/**
 * Root locale page — client-side redirect to /blog/
 * The blog app's content now lives at /[locale]/blog/ after route restructuring.
 */
export default function RootRedirect() {
  const params = useParams();
  const locale = params.locale as string;

  useEffect(() => {
    if (locale) {
      window.location.replace(`/${locale}/blog/`);
    }
  }, [locale]);

  return null;
}
