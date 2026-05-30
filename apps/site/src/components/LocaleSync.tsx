'use client';

import { useLocale } from 'next-intl';
import { useEffect } from 'react';

/**
 * 同步当前 URL locale 到 localStorage，供子站（compli-service）读取。
 * 放在主站 layout 中，每页渲染时确保 localStorage 与 URL locale 一致。
 */
export default function LocaleSync() {
  const locale = useLocale();

  useEffect(() => {
    const key = 'compli-service-locale';
    const current = localStorage.getItem(key);
    if (current !== locale) {
      localStorage.setItem(key, locale);
    }
  }, [locale]);

  return null;
}
