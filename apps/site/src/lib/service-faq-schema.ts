/**
 * 服务页 FAQ 的唯一读取口径（服务端）。
 *
 * 页面上的 FAQ 折叠块由 `components/ServiceFAQ.tsx`（client component）渲染，
 * 这份函数是给 **FAQPage JSON-LD** 用的：同一批 faq{n}q / faq{n}a 键，
 * 服务端读出来喂给 `<FaqPageSchema>`，保证「页面上看到的问答」
 * 与「结构化数据里的问答」永远一致（Google 会比对两者，不一致会丢富结果）。
 *
 * 键的约定：faq1q/faq1a … faq10q/faq10a，遇到第一个缺失就停（与客户端一致）。
 */

import { getTranslations } from 'next-intl/server';

export interface ServiceFaqItem {
  question: string;
  answer: string;
}

export async function serviceFaqItems(
  locale: string,
  namespace: string,
): Promise<ServiceFaqItem[]> {
  const t = await getTranslations({ locale, namespace });
  const items: ServiceFaqItem[] = [];

  for (let i = 1; i <= 10; i += 1) {
    const qKey = `faq${i}q`;
    const aKey = `faq${i}a`;
    if (!t.has(qKey) || !t.has(aKey)) break;
    items.push({ question: t(qKey), answer: t(aKey) });
  }

  return items;
}
