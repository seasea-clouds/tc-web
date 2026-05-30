import { WHATSAPP_URL } from '@/lib/constants';

interface CTASectionProps {
  t: (key: string) => string;
}

export default function CTASection({ t }: CTASectionProps) {
  return (
    <section className="py-16 bg-primary-navy">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{t('ctaTitle')}</h2>
        <p className="text-white/80 mb-2">{t('ctaSubtitle')}</p>
        <p className="text-[#B8960C] text-sm font-medium mb-6">{t('ctaUrgency')}</p>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-accent-gold hover:bg-accent-gold/90 text-white font-semibold px-8 py-3 rounded-md transition-all hover:shadow-lg"
        >
          {t('ctaButton')}
        </a>
      </div>
    </section>
  );
}
