'use client';

import { WHATSAPP_URL } from './constants';
import { Mail, MapPin } from 'lucide-react';
import { useT, useTradeLocale } from './TranslationProvider';

const serviceLinks = [
  { key: 'gaccRegistration', href: '/services/gacc/' },
  { key: 'labelCompliance', href: '/services/label/' },
  { key: 'cccCertification', href: '/services/ccc/' },
  { key: 'cosmeticsFiling', href: '/services/cosmetics/' },
  { key: 'crossBorderEcommerce', href: '/services/ecommerce/' },
  { key: 'brandProtection', href: '/services/brand/' },
];

export default function Footer({ locale: propLocale }: { locale?: string } = {}) {
  const t = useT('Footer');
  const ctxLocale = useTradeLocale();
  const locale = propLocale || ctxLocale || 'en';

  const href = (path: string) => `/${locale}${path}`;

  return (
    <footer className="bg-primary-navy py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          {/* Services */}
          <div>
            <h4 className="text-white font-bold mb-4">{t('services')}</h4>
            <ul className="space-y-2">
              {serviceLinks.map((s) => (
                <li key={s.key}>
                  <a
                    href={href(s.href)}
                    className="text-white/70 hover:text-white transition-colors text-sm"
                  >
                    {t(s.key)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-4">{t('quickLinks')}</h4>
            <ul className="space-y-2">
              <li>
                <a href={href('/about/')} className="text-white/70 hover:text-white transition-colors text-sm">
                  {t('about')}
                </a>
              </li>
              <li>
                <a href={href('/packages/')} className="text-white/70 hover:text-white transition-colors text-sm">
                  {t('packages')}
                </a>
              </li>
              <li>
                <a href={href('/industries/')} className="text-white/70 hover:text-white transition-colors text-sm">
                  {t('industries')}
                </a>
              </li>
              <li>
                <a href={href('/blog/')} className="text-white/70 hover:text-white transition-colors text-sm">
                  {t('blog')}
                </a>
              </li>
              <li>
                <a href={href('/faq/')} className="text-white/70 hover:text-white transition-colors text-sm">
                  {t('faq')}
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-2">
            <h4 className="text-white font-bold mb-4">{t('contact')}</h4>
            <div className="flex flex-col gap-3">
              <a
                href="mailto:david@sinotradecompliance.com"
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
              >
                <Mail className="w-4 h-4 text-white/70" />
                <span>david@sinotradecompliance.com</span>
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
              >
                <svg className="w-4 h-4 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span>{t('whatsapp')}</span>
              </a>
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <MapPin className="w-4 h-4 text-white/70" />
                <span>{t('address')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div id="footer-divider" className="border-t border-white/20 pt-6">
          <p id="copyright-bar" className="text-center text-white/60 text-sm mb-4">{t('rights')}</p>
          <p className="text-center text-white/40 text-xs max-w-2xl mx-auto">
            {t('disclaimer')}
          </p>
        </div>
      </div>
    </footer>
  );
}
