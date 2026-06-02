import { BRAND_NAME, SITE_URL } from './constants';

/**
 * Build hreflang alternates for canonical URLs.
 * Pass the app's locale list since it may differ per app.
 */
export function buildAlternates(locale: string, locales: string[], path: string) {
  return {
    canonical: `${SITE_URL}/${locale}${path}`,
    languages: Object.fromEntries(
      locales.map((l) => [l, `${SITE_URL}/${l}${path}`])
    ),
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
