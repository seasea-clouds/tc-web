/**
 * Centralized metadata configuration for all page types.
 * Each page type has a Title/Description template with SEO keywords.
 * Templates use i18n keys (resolved via next-intl at runtime).
 */

// Service keywords mapping for SEO-optimized titles
export interface ServiceMeta {
  /** i18n key for service name (e.g. 'Services.gaccTitle') */
  titleKey: string;
  /** i18n key for service description */
  descriptionKey: string;
  /** SEO keyword suffix for title */
  keywordKey: string;
}

export const serviceMetaMap: Record<string, ServiceMeta> = {
  gacc: {
    titleKey: 'gaccTitle',
    descriptionKey: 'gaccDescription',
    keywordKey: 'gaccKeyword',
  },
  label: {
    titleKey: 'labelTitle',
    descriptionKey: 'labelDescription',
    keywordKey: 'labelKeyword',
  },
  ccc: {
    titleKey: 'cccTitle',
    descriptionKey: 'cccDescription',
    keywordKey: 'cccKeyword',
  },
  cosmetics: {
    titleKey: 'cosmeticsTitle',
    descriptionKey: 'cosmeticsDescription',
    keywordKey: 'cosmeticsKeyword',
  },
  ecommerce: {
    titleKey: 'ecommerceTitle',
    descriptionKey: 'ecommerceDescription',
    keywordKey: 'ecommerceKeyword',
  },
  trademark: {
    titleKey: 'trademarkTitle',
    descriptionKey: 'trademarkDescription',
    keywordKey: 'trademarkKeyword',
  },
};

// Industry page keywords
export const industryMetaMap: Record<string, { keywordKey: string }> = {
  food: { keywordKey: 'foodKeyword' },
  cosmetics: { keywordKey: 'cosmeticsKeyword' },
  electronics: { keywordKey: 'electronicsKeyword' },
  healthcare: { keywordKey: 'healthcareKeyword' },
  agriculture: { keywordKey: 'agricultureKeyword' },
  chemicals: { keywordKey: 'chemicalsKeyword' },
};

// Brand name used in all metadata titles
export const BRAND_NAME = 'SinoTrade Compliance';
export const SITE_URL = 'https://sinotradecompliance.com';

/**
 * Generate metadata for the homepage.
 */
export function getHomeMetadata(t: (key: string) => string, locale: string) {
  return {
    title: t('heroTitle'),
    description: t('heroSubtitle'),
    alternates: {
      canonical: `${SITE_URL}/${locale}/`,
    },
    openGraph: {
      title: t('heroTitle'),
      description: t('heroSubtitle'),
      locale,
      siteName: BRAND_NAME,
      url: `${SITE_URL}/${locale}/`,
      type: 'website',
    },
  };
}

/**
 * Generate metadata for a service page.
 */
export function getServiceMetadata(
  t: (key: string) => string,
  locale: string,
  serviceSlug: string
) {
  const meta = serviceMetaMap[serviceSlug];
  if (!meta) {
    // Fallback to generic service metadata
    return {
      title: `${t('Services.title')} - ${BRAND_NAME}`,
      description: t('Services.description'),
      alternates: {
        canonical: `${SITE_URL}/${locale}/services/${serviceSlug}/`,
      },
      openGraph: {
        title: `${t('Services.title')} - ${BRAND_NAME}`,
        description: t('Services.description'),
        locale,
        siteName: BRAND_NAME,
        url: `${SITE_URL}/${locale}/services/${serviceSlug}/`,
        type: 'website',
      },
    };
  }

  const title = `${t(`Services.${meta.titleKey}`)} - ${BRAND_NAME}`;
  const description = t(`Services.${meta.descriptionKey}`);

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}/services/${serviceSlug}/`,
    },
    openGraph: {
      title,
      description,
      locale,
      siteName: BRAND_NAME,
      url: `${SITE_URL}/${locale}/services/${serviceSlug}/`,
      type: 'website',
    },
  };
}

/**
 * Generate metadata for an industry page.
 */
export function getIndustryMetadata(
  t: (key: string) => string,
  locale: string,
  industrySlug: string
) {
  const title = `${t(`Industries.${industrySlug}Title`)} - ${BRAND_NAME} | China Import Guide`;
  const description = t(`Industries.${industrySlug}Description`);

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}/industries/${industrySlug}/`,
    },
    openGraph: {
      title,
      description,
      locale,
      siteName: BRAND_NAME,
      url: `${SITE_URL}/${locale}/industries/${industrySlug}/`,
      type: 'website',
    },
  };
}

/**
 * Generate metadata for a blog post page.
 */
export function getBlogMetadata(
  t: (key: string) => string,
  locale: string,
  articleTitle: string,
  articleSummary: string,
  slug: string,
  publishDate?: string
) {
  const title = `${articleTitle} - ${BRAND_NAME}`;
  const description = articleSummary.length > 160
    ? articleSummary.slice(0, 157) + '...'
    : articleSummary;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}/blog/${slug}/`,
    },
    openGraph: {
      title,
      description,
      locale,
      siteName: BRAND_NAME,
      url: `${SITE_URL}/${locale}/blog/${slug}/`,
      type: 'article',
      ...(publishDate ? { publishedTime: publishDate } : {}),
    },
  };
}

/**
 * Generate metadata for generic pages (about, contact, etc.).
 */
export function getGenericMetadata(
  t: (key: string) => string,
  locale: string,
  pagePath: string,
  pageTitle: string,
  pageDescription: string
) {
  const url = `${SITE_URL}/${locale}/${pagePath}/`;
  return {
    title: `${pageTitle} - ${BRAND_NAME}`,
    description: pageDescription,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${pageTitle} - ${BRAND_NAME}`,
      description: pageDescription,
      locale,
      siteName: BRAND_NAME,
      url,
      type: 'website',
    },
  };
}
