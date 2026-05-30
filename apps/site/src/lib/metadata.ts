/**
 * Shared Open Graph config for all pages.
 * Ensures og:image is present on every page.
 */
export function sharedOpenGraph({
  title,
  description,
  locale,
  url,
}: {
  title: string;
  description: string;
  locale: string;
  url: string;
}) {
  return {
    title,
    description,
    locale,
    type: 'website' as const,
    url,
    siteName: 'SinoTrade Compliance',
    images: [{ url: 'https://sinotradecompliance.com/og-image.png', width: 1200, height: 630, alt: 'SinoTrade Compliance' }],
  };
}

export function sharedTwitter({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return {
    card: 'summary_large_image' as const,
    title,
    description,
  };
}
