'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  url: string;
}

export default function CopyButton({ url }: Props) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations('Blog');

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();

    // ═══════ try Clipboard API ═══════
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        ok = true;
      }
    } catch {
      // falls through to fallback
    }

    // ═══════ fallback: textarea + execCommand ═══════
    if (!ok) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
          document.execCommand('copy');
          ok = true;
        } catch { /* ignored */ }
        document.body.removeChild(textarea);
      } catch { /* fallback failed, ok stays false */ }
    }

    // ═══════ always show visual feedback ═══════
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [url]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-2 rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
      aria-label={t('copyLink')}
    >
      {copied ? (
        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )}
    </button>
  );
}
