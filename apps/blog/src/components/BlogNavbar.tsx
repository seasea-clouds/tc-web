interface Props {
  locale: string;
}

const LINKS: Record<string, { label: string; href: string }[]> = {
  en: [
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services/' },
    { label: 'Packages', href: '/packages/' },
    { label: 'FAQ', href: '/faq/' },
    { label: 'Insights', href: '/' },
  ],
};

const QUOTE_LABELS: Record<string, string> = {
  en: 'Get a Quote',
  zh: '获取报价',
  es: 'Obtener Cotización',
  fr: 'Obtenir un Devis',
  de: 'Angebot Einholen',
  ja: '見積もりを取得',
  pt: 'Obter Orçamento',
  ru: 'Получить Предложение',
};

export default function BlogNavbar({ locale }: Props) {
  const links = LINKS[locale] || LINKS.en;
  const quoteLabel = QUOTE_LABELS[locale] || 'Get a Quote';
  
  return (
    <nav className="relative z-50 bg-[#1B365D]/95 backdrop-blur-sm shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <a href={`/${locale}/`} className="text-white font-bold text-lg tracking-tight">
            SinoTrade Compliance
          </a>
          <div className="hidden md:flex items-center space-x-6">
            {links.map(link => (
              <a key={link.label} href={`/${locale}${link.href}`}
                 className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <a href={`https://wa.me/message/HPPZ5X6XZSMLM1`}
               className="bg-[#25D366] text-white text-xs px-3 py-1.5 rounded-md font-medium flex items-center gap-1">
              <span>💬</span> WhatsApp
            </a>
            <a href={`/${locale}/quote/`}
               className="bg-[#2563EB] text-white text-xs px-3 py-1.5 rounded-md font-medium">
              {quoteLabel}
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
