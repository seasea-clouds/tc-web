'use client';

import { usePathname } from 'next/navigation';
import { SITE_URL } from './constants';
import { localeNameZh } from './localeNames';
import {
  FORM_MODULES,
  FORM_PAGE_TITLES,
  FORM_MODULE_FALLBACK,
  FORM_PAGE_TITLE_FALLBACK,
} from './formSources';

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
 * 全站共用的「免费合规评估」表单（web3forms）。
 *
 * site / blog / regulations 三个 app 都用这一份，改样式或加字段只改这里。
 *
 * 刻意做成纯 props 组件：
 * - 本包没有 third-party 依赖（只 peer react/next），不能引 next-intl 或 lucide；
 * - 因此文案一律由调用方取好传进来（site 走 next-intl，blog/regulations 走 getMessages）。
 *
 * `idPrefix` 用来区分同页多份表单的 input id，否则 label 的 htmlFor 会指到第一份。
 */
export default function ComplianceForm({
  locale,
  texts,
  source,
  sourceRef,
  pageTitle,
  pagePath,
  fromName = 'SinoTrade Website',
  idPrefix = 'cf',
}: {
  locale: string;
  texts: ComplianceFormTexts;
  /**
   * 来源 slug（见 formSources.ts 的 FORM_MODULES）：决定邮件里的「页面模块」中文名，
   * 也决定主题里的模块部分。不传就落到「站内页面」。
   */
  source?: string;
  /** 稳定标识的附加段，如文章/法规 slug → 来源标识 `blog-post:<slug>` */
  sourceRef?: string;
  /** 中文页面标题；不传则用 FORM_PAGE_TITLES[source]（文章/法规详情应传 zh 标题） */
  pageTitle?: string;
  /** 覆盖自动探测的路径（默认用 usePathname，静态导出时已含 /<locale>/） */
  pagePath?: string;
  /** web3forms 来信显示名 */
  fromName?: string;
  idPrefix?: string;
}) {
  const pathname = usePathname();
  const moduleName = (source && FORM_MODULES[source]) || FORM_MODULE_FALLBACK;
  const title = pageTitle || (source && FORM_PAGE_TITLES[source]) || FORM_PAGE_TITLE_FALLBACK;
  const langLabel = localeNameZh(locale);
  const pageUrl = pagePath
    ? `${SITE_URL}${pagePath}`
    : pathname
      ? `${SITE_URL}${pathname}`
      : `${SITE_URL}/${locale}/`;
  const sourceTag = source ? (sourceRef ? `${source}:${sourceRef}` : source) : '';
  // 标题已被模块名涵盖时（首页 / 服务 · CCC认证 vs CCC认证）不重复写
  const subject = moduleName.includes(title)
    ? `🔥 询盘 · ${moduleName} · ${langLabel}`
    : `🔥 询盘 · ${moduleName} · ${langLabel} · ${title}`;

  return (
    <section id="contact" className="bg-[#F4F6F9] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
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
          action="https://api.web3forms.com/submit"
          method="POST"
          className="mx-auto w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <input type="hidden" name="access_key" value={process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY} />
          <input type="hidden" name="subject" value={subject} />
          <input type="hidden" name="from_name" value={fromName} />
          {/* 来源标识（2026-10-29）：字段名用中文，web3forms 邮件按「字段名: 值」渲染，
              运营一眼看出语言/模块/页面/URL，不必再翻译英文 slug */}
          <input type="hidden" name="语言" value={langLabel} />
          <input type="hidden" name="页面模块" value={moduleName} />
          <input type="hidden" name="页面标题" value={title} />
          <input type="hidden" name="页面地址" value={pageUrl} />
          <input type="hidden" name="来源标识" value={sourceTag} />
          <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} />
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
                name="email"
                id={`${idPrefix}-email`}
                placeholder={texts.emailPlaceholder}
                required
                className="w-full rounded-md border border-gray-300 py-3 pl-10 pr-4 text-[#333333] shadow-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1B365D]"
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
            <div className="relative">
              <svg
                className="absolute left-3 top-3.5 h-5 w-5 text-[#5F6F7F]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <textarea
                name="message"
                id={`${idPrefix}-message`}
                rows={3}
                placeholder={texts.messagePlaceholder}
                className="w-full rounded-md border border-gray-300 py-3 pl-10 pr-4 text-[#333333] shadow-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1B365D]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3.5 font-bold text-primary-navy shadow-md transition-all duration-300 hover:bg-gold/90"
          >
            {texts.button}
          </button>

          <p className="mt-3 text-center text-xs text-[#5F6F7F]">{texts.privacy}</p>
        </form>
      </div>
    </section>
  );
}
