import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface FAQPreviewProps {
  locale: string;
  t: (key: string) => string;
}

export default function FAQPreview({ locale, t }: FAQPreviewProps) {
  const items = [
    { q: t('faqPreviewQ1'), a: t('faqPreviewA1') },
    { q: t('faqPreviewQ2'), a: t('faqPreviewA2') },
    { q: t('faqPreviewQ3'), a: t('faqPreviewA3') },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-bold text-primary-navy mb-2 text-center">
          {t('faqPreviewTitle')}
        </h2>
        <p className="text-text-muted text-center mb-10">{t('faqPreviewSubtitle')}</p>

        <div className="space-y-6">
          {items.map((item, i) => (
            <div key={i} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
              <h3 className="text-lg font-semibold text-primary-navy mb-2">{item.q}</h3>
              <p className="text-text-charcoal leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href={`/${locale}/faq`}
            className="inline-flex items-center gap-1 text-primary-navy hover:text-accent-gold font-semibold transition-colors"
          >
            {t('faqPreviewLink')} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
