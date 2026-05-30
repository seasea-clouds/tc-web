import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Shield, Tag, Truck, Sparkles, ShoppingCart, Globe } from 'lucide-react';

const CATEGORY_SERVICE_MAP: Record<string, { href: string; icon: string; serviceKey: string }> = {
  'Food & Beverage': { href: '/services/gacc', icon: 'Truck', serviceKey: 'gacc' },
  'Label Compliance': { href: '/services/label', icon: 'Tag', serviceKey: 'label' },
  'Product Certification': { href: '/services/ccc', icon: 'Shield', serviceKey: 'ccc' },
  'Cosmetics': { href: '/services/cosmetics', icon: 'Sparkles', serviceKey: 'cosmetics' },
  'E-commerce': { href: '/services/ecommerce', icon: 'ShoppingCart', serviceKey: 'ecommerce' },
};

const ICON_MAP: Record<string, React.ElementType> = {
  Truck, Tag, Shield, Sparkles, ShoppingCart, Globe,
};

export default async function RelatedServiceCard({
  locale,
  category,
}: {
  locale: string;
  category: string;
}) {
  const service = CATEGORY_SERVICE_MAP[category];
  if (!service) return null;

  const t = await getTranslations({ locale, namespace: 'Blog' });
  const Icon = ICON_MAP[service.icon] || Globe;

  return (
    <div className="mt-12 p-6 rounded-xl text-white" style={{ background: 'linear-gradient(to right, #1B365D, rgba(27,54,93,0.9))' }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(184,150,12,0.2)' }}>
          <Icon className="w-6 h-6" style={{ color: '#B8960C' }} />
        </div>
        <div className="flex-1">
          <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{t('relatedServiceLabel') || 'Need Help With This?'}</p>
          <h3 className="text-lg font-bold">{t(`service_${service.serviceKey}`) || category}</h3>
        </div>
        <Link
          href={`/${locale}${service.href}`}
          className="inline-flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-lg whitespace-nowrap transition-colors shadow-lg"
          style={{ backgroundColor: '#B8960C' }}
        >
          {t('relatedServiceCta') || 'Get Free Assessment →'}
        </Link>
      </div>
    </div>
  );
}
