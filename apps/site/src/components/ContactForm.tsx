'use client';

import { useTranslations, useLocale } from 'next-intl';
import { ComplianceForm } from '@trade/ui';

/**
 * site 的免费合规评估表单 —— 只是 @trade/ui ComplianceForm 的薄壳。
 *
 * 真正的表单结构/样式全在 packages/ui/src/ComplianceForm.tsx（blog、regulations 共用同一份）。
 * 这里只负责一件事：用 next-intl 取文案并透传。
 *
 * `source` 用来区分询盘来自哪个页面（Home / FAQ / Packages / Services: CCC …），
 * 不传就是默认的「SinoTrade Website」。
 */
export default function ContactForm({
  source,
  sourceRef,
  pageTitle,
}: {
  source?: string;
  /** 附加标识（如行业 slug），用于「来源标识」 */
  sourceRef?: string;
  /** 中文页面标题（动态页用；固定页留空，由 FORM_PAGE_TITLES 兜底） */
  pageTitle?: string;
}) {
  const t = useTranslations('ContactForm');
  const locale = useLocale();

  return (
    <ComplianceForm
      locale={locale}
      source={source}
      sourceRef={sourceRef}
      pageTitle={pageTitle}
      fromName="SinoTrade Website"
      idPrefix="site-contact"
      texts={{
        title: t('title'),
        subtitle: t('subtitle'),
        emailLabel: t('emailLabel'),
        emailPlaceholder: t('emailPlaceholder'),
        messageLabel: t('messageLabel'),
        messagePlaceholder: t('messagePlaceholder'),
        button: t('button'),
        privacy: t('privacy'),
      }}
    />
  );
}
