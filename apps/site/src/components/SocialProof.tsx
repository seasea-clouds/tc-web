'use client';

import { useTranslations } from 'next-intl';

export default function SocialProof() {
  const t = useTranslations('Home');

  const stats = [
    { number: t('stat1Number'), label: t('stat1Label') },
    { number: t('stat2Number'), label: t('stat2Label') },
    { number: t('stat3Number'), label: t('stat3Label') },
    { number: t('stat4Number'), label: t('stat4Label') },
  ];

  return (
    <section className="py-12 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-navy mb-2 text-center">{t('socialProofTitle')}</h2>
          <p className="text-text-muted text-center">{t('socialProofSubtitle')}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-accent-gold mb-1">{s.number}</div>
              <div className="text-sm text-text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
