'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Mail, MessageSquare } from 'lucide-react';

export default function ContactForm() {
  const t = useTranslations('ContactForm');
  const locale = useLocale();

  return (
    <section id="contact" className="bg-[#F4F6F9] py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4"><Mail className="w-6 h-6 text-gold" /></div>
        <h2 className="text-2xl md:text-3xl font-bold text-primary-navy mb-3 text-center">
          {t('title')}
        </h2>
        <p className="text-[#5F6F7F] mb-8 leading-relaxed">
          {t('subtitle')}
        </p>
        <form
          action="https://api.web3forms.com/submit"
          method="POST"
          className="w-full max-w-md mx-auto bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-sm"
        >
          <input
            type="hidden"
            name="access_key"
            value="b1e6d34d-9fdc-4dc1-9bb2-6fc9090b361c"
          />
          <input
            type="hidden"
            name="subject"
            value="🔥 New Inquiry — SinoTrade Website"
          />
          <input
            type="hidden"
            name="from_name"
            value="SinoTrade Website"
          />
          <input
            type="checkbox"
            name="botcheck"
            className="hidden"
            style={{ display: 'none' }}
          />
          <input
            type="hidden"
            name="redirect"
            value={`https://sinotradecompliance.com/${locale}/thank-you`}
          />

          {/* Email */}
          <div className="mb-4 relative">
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-[#333333] mb-1 text-left"
            >
              {t('emailLabel')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5F6F7F]" />
              <input
                type="email"
                name="email"
                id="email"
                placeholder={t('emailPlaceholder')}
                required
                className="w-full pl-10 pr-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1B365D] focus:border-transparent transition-all shadow-sm text-[#333333]"
              />
            </div>
          </div>

          {/* Message (optional) */}
          <div className="mb-4 relative">
            <label
              htmlFor="message"
              className="block text-sm font-semibold text-[#333333] mb-1 text-left"
            >
              {t('messageLabel')}
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3.5 w-5 h-5 text-[#5F6F7F]" />
              <textarea
                name="message"
                id="message"
                rows={3}
                placeholder={t('messagePlaceholder')}
                className="w-full pl-10 pr-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1B365D] focus:border-transparent transition-all shadow-sm text-[#333333]"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full mt-2 bg-gold hover:bg-gold/90 text-primary-navy font-bold py-3.5 px-4 rounded-lg transition-all duration-300 shadow-md flex justify-center items-center gap-2"
          >
            {t('button')}
          </button>

          <p className="text-xs text-[#5F6F7F] text-center mt-3">{t('privacy')}</p>
        </form>
      </div>
    </section>
  );
}
