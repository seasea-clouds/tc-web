/* eslint-disable @next/next/no-img-element */
'use client';

import { useTranslations } from 'next-intl';
import { MessageCircle } from 'lucide-react';
import { WHATSAPP_URL } from '@/lib/constants';

export default function Expert() {
  const t = useTranslations('About');

  const name = t('teamMember1Name');
  const role = t('teamMember1Role');
  const desc = t('teamMember1Desc');

  return (
    <section className="bg-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-primary-navy mb-8 text-center">
          {t('teamTitle')}
        </h2>
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-[#F4F6F9] flex-shrink-0">
            <img
              src="/images/david-zhang.webp"
              alt={name}
              className="w-full h-full object-cover"
              loading="eager"
              decoding="async"
            />
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-xl font-bold text-[#333333]">{name}</h3>
            <p className="text-[#2563EB] font-medium mb-3">{role}</p>
            <p className="text-[#5F6F7F] leading-relaxed mb-4">{desc}</p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-semibold px-6 py-3 rounded-md transition-all hover:shadow-md"
            >
              <MessageCircle className="w-4 h-4" />
              {t('cta')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
