'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';

/**
 * Root locale page — client-side redirect to /insights/
 * The insights app's content now lives at /[locale]/insights/ after route restructuring.
 */
export default function RootRedirect() {
  const params = useParams();
  const locale = params.locale as string;

  useEffect(() => {
    if (locale) {
      window.location.replace(`/${locale}/insights/`);
    }
  }, [locale]);

  return null;
}
