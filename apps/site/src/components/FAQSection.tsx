'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';

const CATEGORY_PATHS: Record<string, string> = {
  general: '/about/',
  gacc: '/services/gacc/',
  label: '/services/label/',
  ccc: '/services/ccc/',
  cosmetics: '/services/cosmetics/',
  ecommerce: '/services/ecommerce/',
  brand: '/services/brand/',
};

const CATEGORY_KEYS: Record<string, string> = {
  general: 'generalName',
  gacc: 'gaccName',
  label: 'labelName',
  ccc: 'cccName',
  cosmetics: 'cosmeticsName',
  ecommerce: 'ecommerceName',
  brand: 'brandName',
};

interface CategoryProps {
  title: string;
  items: { question: string; answer: string }[];
  categoryPrefix: string;
}

function FAQCategory({ title, items, categoryPrefix }: CategoryProps) {
  const t = useTranslations('Faq');
  const locale = useLocale();
  const nameKey = CATEGORY_KEYS[categoryPrefix];
  const path = CATEGORY_PATHS[categoryPrefix];
  const href = path ? `/${locale}${path}` : '';
  const serviceName = nameKey ? t(`learnMoreNames.${nameKey}`) : '';

  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-primary-navy mb-4">{title}</h2>
      <dl className="space-y-3">
        {items.map((item, i) => (
          <details
            key={i}
            className="group bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden"
          >
            <summary className="flex items-center justify-between cursor-pointer px-6 py-5 text-left font-semibold text-primary-navy hover:bg-bg-ice transition-colors list-none [&::-webkit-details-marker]:hidden">
              <dt>{item.question}</dt>
              <svg
                className="w-5 h-5 text-accent-gold transition-transform group-open:rotate-180 flex-shrink-0 ml-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <dd className="px-6 pb-5 text-text-muted leading-relaxed">
              {item.answer}
              {href && serviceName && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Link
                    href={href}
                    className="text-sm text-accent-gold hover:text-[#9A7D0A] font-medium inline-flex items-center gap-1 transition-colors"
                  >
                    {t('learnMore')} → {serviceName}
                  </Link>
                </div>
              )}
            </dd>
          </details>
        ))}
      </dl>
    </div>
  );
}

export default function FAQSection({
  categories,
}: {
  categories: { title: string; items: { question: string; answer: string }[]; prefix: string }[];
}) {
  return (
    <section className="py-16 bg-bg-ice">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {categories.map((cat, i) => (
          <FAQCategory
            key={i}
            title={cat.title}
            items={cat.items}
            categoryPrefix={cat.prefix}
          />
        ))}
      </div>
    </section>
  );
}
