import { BRAND_NAME, SITE_URL } from '@trade/ui';

export { BRAND_NAME, SITE_URL };

/**
 * safeTitle — 确保标题长度在 SEO 最佳范围内
 * 
 * 上限 80 字符的考虑（2025 年验证）：
 * - Google SERP 标题显示宽度约 580-600px，中文字符每个 ≈ 2 拉丁字宽度
 * - 80 字符以内可完整展示，超长则 Google 在中间截断加 `...`，降低 CTR
 * - 下限 35 字符避免浪费展示空间、关键词密度不足
 * - 截断时品牌名 `- SinoTrade Compliance` 始终保留在尾部
 * 
 * - 最少 35 字符（对 CJK 语言可接受，每个 CJK 字 ≈ 2 拉丁字的语义密度）
 * - 最长 80 字符
 * 当 base + brand 过短时，自动追加描述性上下文关键词
 */
function safeTitle(base: string, keywordContext?: string): string {
  const withBrand = `${base} - ${BRAND_NAME}`;
  if (withBrand.length >= 35 && withBrand.length <= 80) return withBrand;
  
  // 过短：追加关键词上下文
  if (withBrand.length < 35 && keywordContext) {
    const contextualized = `${base} - ${keywordContext} | ${BRAND_NAME}`;
    if (contextualized.length <= 80) return contextualized;
    return contextualized.slice(0, 77) + '...';
  }
  
  // 过长：截断 base
  if (withBrand.length > 80) {
    const maxBase = 80 - ` - ${BRAND_NAME}...`.length;
    return base.slice(0, maxBase) + `... - ${BRAND_NAME}`;
  }
  
  return withBrand;
}

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
  brand: {
    titleKey: 'brandTitle',
    descriptionKey: 'brandDescription',
    keywordKey: 'brandKeyword',
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

/**
 * Generate metadata for the homepage.
 */
export function getHomeMetadata(t: (key: string) => string, locale: string) {
  const title = safeTitle(t('heroTitle'), t('heroSubtitle').substring(0, 60));
  const description = t('heroSubtitle');

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}/`,
    },
    openGraph: {
      title,
      description,
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
    const baseTitle = t('Services.title');
    const sub = t('Services.subtitle') || '';
    return {
      title: safeTitle(baseTitle, sub.substring(0, 50)),
      description: sub,
      alternates: {
        canonical: `${SITE_URL}/${locale}/services/${serviceSlug}/`,
      },
      openGraph: {
        title: safeTitle(baseTitle, sub.substring(0, 50)),
        description: sub,
        locale,
        siteName: BRAND_NAME,
        url: `${SITE_URL}/${locale}/services/${serviceSlug}/`,
        type: 'website',
      },
    };
  }

  const baseTitle = t(`Services.${meta.titleKey}`);
  const description = t(`Services.${meta.descriptionKey}`);
  const keywordHint = t(`Services.${meta.keywordKey}`);
  // 检查是否是未翻译的 key（next-intl 在 key 不存在时返回 key 本身）
  const cleanHint = keywordHint && !keywordHint.startsWith('Services.') ? keywordHint : '';

  const title = safeTitle(baseTitle, cleanHint || description?.substring(0, 40));

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
  const title = safeTitle(
    t(`Industries.${industrySlug}Title`),
    'China Import Compliance Guide'
  );
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
  const title = safeTitle(articleTitle, 'China Import Compliance Guide');
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
  const title = safeTitle(pageTitle, pageDescription?.substring(0, 40));

  return {
    title,
    description: pageDescription,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description: pageDescription,
      locale,
      siteName: BRAND_NAME,
      url,
      type: 'website',
    },
  };
}
