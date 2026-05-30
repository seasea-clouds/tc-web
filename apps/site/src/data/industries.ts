/**
 * Industry vertical landing page definitions.
 * Each industry maps to specific compliance services and targets a distinct exporter segment.
 */

export interface IndustryDef {
  slug: string;
  emoji: string;
  /** i18n namespace for this industry's translations */
  namespace: string;
  /** Services this industry needs (slugs matching /services/* routes) */
  services: string[];
  /** FAQ count for this industry */
  faqCount: number;
}

export const industries: IndustryDef[] = [
  {
    slug: 'dairy-milk-products',
    emoji: '🥛',
    namespace: 'IndustryDairy',
    services: ['gacc', 'label'],
    faqCount: 6,
  },
  {
    slug: 'meat-seafood',
    emoji: '🥩',
    namespace: 'IndustryMeat',
    services: ['gacc', 'label'],
    faqCount: 6,
  },
  {
    slug: 'wine-spirits',
    emoji: '🍷',
    namespace: 'IndustryWine',
    services: ['gacc', 'label', 'brand'],
    faqCount: 6,
  },
  {
    slug: 'skincare-cosmetics',
    emoji: '💄',
    namespace: 'IndustrySkincare',
    services: ['cosmetics', 'label', 'brand'],
    faqCount: 6,
  },
  {
    slug: 'pet-food',
    emoji: '🐾',
    namespace: 'IndustryPetFood',
    services: ['gacc', 'label'],
    faqCount: 6,
  },
  {
    slug: 'health-supplements',
    emoji: '💊',
    namespace: 'IndustrySupplements',
    services: ['gacc', 'label', 'ccc'],
    faqCount: 6,
  },
  {
    slug: 'baby-maternal',
    emoji: '👶',
    namespace: 'IndustryBaby',
    services: ['gacc', 'cosmetics', 'label'],
    faqCount: 6,
  },
  {
    slug: 'consumer-electronics',
    emoji: '📱',
    namespace: 'IndustryElectronics',
    services: ['ccc', 'label', 'brand'],
    faqCount: 6,
  },
  {
    slug: 'medical-devices',
    emoji: '🏥',
    namespace: 'IndustryMedical',
    services: ['ccc', 'label'],
    faqCount: 6,
  },
  {
    slug: 'cross-border-ecommerce',
    emoji: '🛒',
    namespace: 'IndustryEcommerce',
    services: ['ecommerce', 'gacc', 'label'],
    faqCount: 6,
  },
] as const;

export const industryBySlug = (slug: string): IndustryDef | undefined =>
  industries.find((i) => i.slug === slug);

export const industrySlugs = industries.map((i) => i.slug);
