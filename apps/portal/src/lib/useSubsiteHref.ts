import { useLocale } from 'next-intl';

/**
 * Generates locale-prefixed internal links: /{locale}/c/<path>
 */
export default function useSubsiteHref() {
  const locale = useLocale();
  return (path: string) => `/${locale}/c${path.startsWith('/') ? '' : '/'}${path}`;
}
