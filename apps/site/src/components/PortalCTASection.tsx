import Link from 'next/link';

interface PortalCTASectionProps {
  t: (key: string) => string;
  href: string;
  /** When true, uses generic title ("Still have questions?") instead of module-specific */
  generic?: boolean;
}

export default function PortalCTASection({ t, href, generic = false }: PortalCTASectionProps) {
  const title = generic ? t('portalCtaGenericTitle') : t('portalCtaTitle');
  const linkText = generic ? t('portalCtaGenericLink') : t('portalCtaLink');

  return (
    <section className="py-12 bg-bg-ice">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-xl font-bold text-primary-navy mb-2">{title}</h2>
        <Link
          href={href}
          className="inline-block text-accent-gold hover:text-accent-gold/80 font-semibold text-lg underline underline-offset-4 transition-colors"
        >
          {linkText} →
        </Link>
      </div>
    </section>
  );
}
