import { BRAND_NAME, SITE_URL } from './constants';

/**
 * Build the hreflang languages object with x-default.
 * Shared helper to ensure all pages include x-default in alternates.
 */
export function buildLanguages(locale: string, locales: string[], path: string): Record<string, string> {
  return {
    // x-default 始终指向英文，作为浏览器语言不匹配时的兜底
    'x-default': `${SITE_URL}/en${path}`,
    ...Object.fromEntries(
      locales.map((l) => [l, `${SITE_URL}/${l}${path}`])
    ),
  };
}

/**
 * Build hreflang alternates for canonical URLs.
 * Pass the app's locale list since it may differ per app.
 * Automatically includes x-default pointing to the current locale.
 */
export function buildAlternates(locale: string, locales: string[], path: string) {
  return {
    canonical: `${SITE_URL}/${locale}${path}`,
    languages: buildLanguages(locale, locales, path),
  };
}

/**
 * Shared Open Graph config for all pages.
 * Ensures og:image is present on every page.
 */
export function sharedOpenGraph({
  title,
  description,
  locale,
  url,
  type = 'website',
}: {
  title: string;
  description: string;
  locale: string;
  url: string;
  type?: string;
}) {
  return {
    title,
    description,
    locale,
    type,
    url,
    siteName: BRAND_NAME,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: BRAND_NAME,
      },
    ],
  };
}

/**
 * Shared Twitter card config.
 */
export function sharedTwitter({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return {
    card: 'summary_large_image',
    title,
    description,
    images: [`${SITE_URL}/og-image.png`],
  };
}
