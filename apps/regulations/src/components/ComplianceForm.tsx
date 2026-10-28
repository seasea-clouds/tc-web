import { SITE_URL } from '@trade/ui';

export interface ComplianceFormTexts {
  title: string;
  subtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  button: string;
  privacy: string;
}

/**
 * 免费合规评估表单（web3forms）。
 * 详情页和列表页共用，避免两处各写一份导致改文案时漏掉一边。
 *
 * 注意：这里用 `idPrefix` 区分实例的 input id，否则同一页面出现两个表单时
 * label 的 htmlFor 会指到第一个 input 上，点击标签聚焦错位。
 */
export default function ComplianceForm({
  locale,
  texts,
  subject,
  idPrefix = 'cf',
}: {
  locale: string;
  texts: ComplianceFormTexts;
  /** 收件主题，用来区分询盘来自哪个页面 */
  subject: string;
  idPrefix?: string;
}) {
  return (
    <section className="bg-[#F4F6F9] py-16">
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
          <svg className="h-6 w-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="mb-3 text-2xl font-bold text-[#333333] md:text-3xl">{texts.title}</h2>
        <p className="mb-8 leading-relaxed text-[#5F6F7F]">{texts.subtitle}</p>
        <form
          className="mx-auto w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
          action="https://api.web3forms.com/submit"
          method="POST"
        >
          <input type="hidden" name="access_key" value={process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY} />
          <input type="hidden" name="subject" value={subject} />
          <input type="hidden" name="from_name" value="SinoTrade Regulations" />
          <input type="checkbox" className="hidden" style={{ display: 'none' }} name="botcheck" />
          <input type="hidden" name="redirect" value={`${SITE_URL}/${locale}/thank-you`} />
          <div className="relative mb-4">
            <label
              htmlFor={`${idPrefix}-email`}
              className="mb-1 block text-left text-sm font-semibold text-[#333333]"
            >
              {texts.emailLabel}
            </label>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5F6F7F]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <input
                type="email"
                id={`${idPrefix}-email`}
                placeholder={texts.emailPlaceholder}
                required
                className="w-full rounded-md border border-gray-300 py-3 pl-10 pr-4 text-[#333333] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1B365D]"
                name="email"
              />
            </div>
          </div>
          <div className="relative mb-4">
            <label
              htmlFor={`${idPrefix}-message`}
              className="mb-1 block text-left text-sm font-semibold text-[#333333]"
            >
              {texts.messageLabel}
            </label>
            <textarea
              name="message"
              id={`${idPrefix}-message`}
              rows={3}
              placeholder={texts.messagePlaceholder}
              className="w-full rounded-md border border-gray-300 py-3 pl-4 pr-4 text-[#333333] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1B365D]"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-gold px-4 py-3.5 font-bold text-primary-navy shadow-md transition-all hover:bg-gold/90"
          >
            {texts.button}
          </button>
          <p className="mt-3 text-center text-xs text-[#5F6F7F]">{texts.privacy}</p>
        </form>
      </div>
    </section>
  );
}
