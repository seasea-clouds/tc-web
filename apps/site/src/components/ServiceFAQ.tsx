'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';

interface ServiceFAQProps {
  namespace: string;
  services?: string[];
}

// Map service prefix → page slug + translation key
const SERVICE_LINKS: Record<string, { slug: string; nameKey: string }> = {
  gacc: { slug: '/services/gacc/', nameKey: 'gaccName' },
  label: { slug: '/services/label/', nameKey: 'labelName' },
  ccc: { slug: '/services/ccc/', nameKey: 'cccName' },
  cosmetics: { slug: '/services/cosmetics/', nameKey: 'cosmeticsName' },
  ecommerce: { slug: '/services/ecommerce/', nameKey: 'ecommerceName' },
  brand: { slug: '/services/brand/', nameKey: 'brandName' },
};

export default function ServiceFAQ({ namespace, services }: ServiceFAQProps) {
  const t = useTranslations(namespace);
  const faqT = useTranslations('Faq');
  const locale = useLocale();
  const questionsTitle = t('questionsTitle');
  const questionsSubtitle = t('questionsSubtitle');

  // Determine the best service link for "Learn More"
  const defaultService = services?.[0];
  const linkInfo = defaultService ? SERVICE_LINKS[defaultService] : null;
  const learnMoreHref = linkInfo ? `/${locale}${linkInfo.slug}` : `/${locale}/services/`;
  const learnMoreText = linkInfo
    ? `${faqT('learnMore')} → ${faqT(`learnMoreNames.${linkInfo.nameKey}`)}`
    : faqT('learnMore');

  // Dynamically collect all FAQ entries (faq1q/faq1a ... faqNq/faqNa)
  const questions: { q: string; a: string }[] = [];
  for (let i = 1; i <= 10; i++) {
    const qKey = `faq${i}q`;
    const aKey = `faq${i}a`;
    if (t.has(qKey) && t.has(aKey)) {
      questions.push({ q: t(qKey), a: t(aKey) });
    } else {
      break;
    }
  }

  return (
    <section className="py-16 bg-bg-ice">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-navy mb-3">{questionsTitle}</h2>
          <p className="text-text-muted max-w-2xl mx-auto">{questionsSubtitle}</p>
        </div>

        <div className="space-y-4">
          {questions.map((item, i) => (
            <details
              key={i}
              className="group bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden"
            >
              <summary className="flex items-center justify-between cursor-pointer px-6 py-5 text-left font-semibold text-primary-navy hover:bg-bg-ice transition-colors list-none [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
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
              <div className="px-6 pb-5 text-text-muted leading-relaxed">
                {item.a}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Link
                    href={learnMoreHref}
                    className="text-sm text-accent-gold hover:text-[#9A7D0A] font-medium inline-flex items-center gap-1 transition-colors"
                  >
                    {learnMoreText}
                  </Link>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
