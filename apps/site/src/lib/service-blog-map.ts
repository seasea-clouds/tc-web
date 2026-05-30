/**
 * Map service slugs to blog category names per locale.
 * Blog categories are localized, so we need locale-specific mapping.
 */

const SERVICE_BLOG_CATEGORY: Record<string, Record<string, string>> = {
  gacc: {
    en: 'Food & Beverage',
    zh: '食品及饮料',
    es: 'Alimentos y Bebidas',
    fr: 'Aliments et Boissons',
    de: 'Lebensmittel und Getränke',
    ja: '食品・飲料',
    ko: '식품 및 음료',
    ar: 'الأغذية والمشروبات',
    ru: 'Продукты и напитки',
    pt: 'Alimentos e Bebidas',
    // Fallback for other 38 locales
    _default: 'Food & Beverage',
  },
  label: {
    en: 'Label Compliance',
    zh: '标签合规性',
    es: 'Cumplimiento de Etiquetado',
    fr: 'Conformité d\'Étiquetage',
    de: 'Kennzeichnungskonformität',
    ja: 'ラベルコンプライアンス',
    ko: '라벨 규정 준수',
    ar: 'الامتثال للوسم',
    ru: 'Соответствие маркировке',
    pt: 'Conformidade de Rotulagem',
    _default: 'Label Compliance',
  },
  ccc: {
    en: 'Product Certification',
    zh: '产品认证',
    es: 'Certificación de Productos',
    fr: 'Certification de Produits',
    de: 'Produktzertifizierung',
    ja: '製品認証',
    ko: '제품 인증',
    ar: 'شهادة المنتج',
    ru: 'Сертификация продукции',
    pt: 'Certificação de Produtos',
    _default: 'Product Certification',
  },
  cosmetics: {
    en: 'Cosmetics',
    zh: '化妆品',
    es: 'Cosméticos',
    fr: 'Cosmétiques',
    de: 'Kosmetik',
    ja: '化粧品',
    ko: '화장품',
    ar: 'مستحضرات التجميل',
    ru: 'Косметика',
    pt: 'Cosméticos',
    _default: 'Cosmetics',
  },
  ecommerce: {
    en: 'E-commerce',
    zh: '电子商务',
    es: 'Comercio Electrónico',
    fr: 'Commerce Électronique',
    de: 'E-Commerce',
    ja: '電子商取引',
    ko: '전자상거래',
    ar: 'التجارة الإلكترونية',
    ru: 'Электронная коммерция',
    pt: 'Comércio Eletrônico',
    _default: 'E-commerce',
  },
  brand: {
    en: 'Brand Protection',
    zh: '品牌保护',
    es: 'Protección de Marca',
    fr: 'Protection de la Marque',
    de: 'Markenschutz',
    ja: 'ブランド保護',
    ko: '브랜드 보호',
    ar: 'حماية العلامة التجارية',
    ru: 'Защита бренда',
    pt: 'Proteção de Marca',
    _default: 'Brand Protection',
  },
};

export function getBlogCategoryForService(
  serviceSlug: string,
  locale: string
): string {
  const serviceMap = SERVICE_BLOG_CATEGORY[serviceSlug];
  if (!serviceMap) return '';
  return serviceMap[locale] || serviceMap._default || '';
}
