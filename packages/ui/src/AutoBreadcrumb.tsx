'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useT, useTradeLocale } from './TranslationProvider';

interface Segment {
  label: string;
  href?: string;
}

// Path segment → i18n key mapping
const SEGMENT_LABELS: Record<string, string> = {
  'services': 'services',
  'gacc': 'gacc',
  'label': 'label',
  'ccc': 'ccc',
  'cosmetics': 'cosmetics',
  'ecommerce': 'ecommerce',
  'brand': 'brand',
  'industries': 'industries',
  'about': 'about',
  'faq': 'faq',
  'packages': 'packages',
  'blog': 'blog',
  'quote': 'quote',
  'testimonials': 'testimonials',
  'privacy': 'privacy',
};

// Industry slugs → i18n key mapping
const INDUSTRY_LABELS: Record<string, string> = {
  'dairy-milk-products': 'industriesDropdown.dairymilkproducts',
  'meat-seafood': 'industriesDropdown.meatseafood',
  'wine-spirits': 'industriesDropdown.winespirits',
  'skincare-cosmetics': 'industriesDropdown.skincarecosmetics',
  'pet-food': 'industriesDropdown.petfood',
  'health-supplements': 'industriesDropdown.healthsupplements',
  'baby-maternal': 'industriesDropdown.babymaternal',
  'consumer-electronics': 'industriesDropdown.consumerelectronics',
  'medical-devices': 'industriesDropdown.medicaldevices',
  'cross-border-ecommerce': 'industriesDropdown.crossborderecommerce',
};

export interface AutoBreadcrumbProps {
  locale: string;
}

/**
 * Client component that automatically generates breadcrumbs from the current URL path.
 * Uses usePathname() to derive breadcrumb items, and useT() for i18n labels.
 */
export default function AutoBreadcrumb({ locale }: AutoBreadcrumbProps) {
  const pathname = usePathname();
  const t = useT('Navbar');

  // Skip root and locale-only paths
  if (!pathname || pathname === '/' || pathname === `/${locale}`) {
    return null;
  }

  // Split pathname: /en/services/gacc/ → ['services', 'gacc']
  const segments = pathname.split('/').filter(Boolean);
  // Remove locale prefix
  const pathSegments = segments.length > 0 && segments[0] === locale ? segments.slice(1) : segments;

  if (pathSegments.length === 0) return null;

  // Build items: accumulate href segments
  const items: Segment[] = [
    { label: t('home'), href: `/${locale}/` },
  ];

  let accumulated = '';
  // Track which segment type we're in (for special handling)
  let inIndustry = false;

  for (let i = 0; i < pathSegments.length; i++) {
    const seg = pathSegments[i];
    accumulated += `/${seg}`;
    const href = `/${locale}${accumulated}/`;

    // Detect special path patterns
    if (pathSegments[i - 1] === 'industries' && INDUSTRY_LABELS[seg]) {
      // Industry slug → use industry label
      const labelKey = INDUSTRY_LABELS[seg];
      const label = t(labelKey);
      items.push({ label, href });
      inIndustry = true;
      continue;
    }

    // Blog posts: /blog/{slug} → use slug as label
    if (pathSegments[i - 1] === 'blog' && i > 0) {
      const label = seg.replace(/-/g, ' ');
      items.push({ label });
      continue;
    }

    // Portal check pages: /c/check/{type}/
    if (seg === 'check' && i > 0 && pathSegments[i - 1] === 'c') {
      continue; // skip /c/check/ segment, next segment will be the check type
    }
    if (inIndustry) {
      inIndustry = false;
      continue; // industry slug already handled above
    }

    // General segment lookup
    const labelKey = SEGMENT_LABELS[seg];
    if (labelKey) {
      const label = t(labelKey);
      items.push({ label, href });
    } else {
      // Unknown segment → use formatted slug
      const label = seg.replace(/-/g, ' ').replace(/_/g, ' ');
      items.push({ label });
    }
  }

  // Last item should not have href (current page)
  if (items.length > 1) {
    items[items.length - 1].href = undefined;
  }

  // Build JSON-LD breadcrumb structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items
      .filter((item) => item.href)
      .map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: `https://sinotradecompliance.com${item.href}`,
      })),
  };

  return (
    <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <ol className="flex items-center gap-1.5 text-sm text-text-muted flex-wrap">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <svg
                  className="w-3.5 h-3.5 flex-shrink-0 text-text-muted/50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
              {isLast || !item.href ? (
                <span className="text-text-charcoal font-medium truncate max-w-[200px] sm:max-w-none">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-primary-navy transition-colors truncate max-w-[200px] sm:max-w-none"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </nav>
  );
}
