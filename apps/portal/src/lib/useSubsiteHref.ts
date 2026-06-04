import { useLocale } from 'next-intl';

/**
 * Generates locale-prefixed internal links: /{locale}/c/<path>
 */
export default function useSubsiteHref() {
  const locale = useLocale();
  return (path: string) => {
    // strip leading/trailing noise
    const cleanPath = path.replace(/\?+$/, '').replace(/^\/+/, '/');
    return `/${locale}/c${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
  };
}
