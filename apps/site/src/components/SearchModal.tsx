'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Search, X, FileText, BookOpen, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { loadSearchIndex, search, type SearchResult } from '@/lib/search';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  service: <FileText className="w-4 h-4 text-accent-blue" />,
  blog: <BookOpen className="w-4 h-4 text-accent-gold" />,
  faq: <HelpCircle className="w-4 h-4 text-text-muted" />,
};

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const t = useTranslations('Search');
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus input on open (reset only on open transition)
  const prevOpenRef = useRef(open);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setQuery('');
      setResults([]);
      setActiveIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    prevOpenRef.current = open;
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // Search on query change
  useEffect(() => {
    if (!query.trim()) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    loadSearchIndex(locale).then((index) => {
      const r = search(query, index);
      setResults(r);
      setLoading(false);
    });
  }, [query, locale]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        const item = results[activeIndex]?.item;
        if (item) {
          window.location.href = `/${locale}${item.href}`;
        }
      }
    },
    [results, activeIndex, locale]
  );

  if (!open) return null;

  // Group results by type
  const grouped: Record<string, SearchResult[]> = {};
  for (const r of results) {
    if (!grouped[r.item.type]) grouped[r.item.type] = [];
    grouped[r.item.type].push(r);
  }

  return (
    <>
      {/* Backdrop — click outside to close */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal container — full viewport, centered */}
      <div
        className="fixed inset-0 z-[101] flex items-start justify-center pt-16 sm:pt-24 px-4 pointer-events-none"
      >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden pointer-events-auto"
        style={{ maxHeight: 'calc(100vh - 8rem)' }}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <Search className="w-5 h-5 text-text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('placeholder')}
            className="flex-1 text-base outline-none placeholder:text-text-muted/60"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Clear"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs text-text-muted bg-gray-100 rounded border border-gray-200">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 14rem)' }}>
          {loading && (
            <div className="px-5 py-8 text-center text-text-muted">{t('searching')}</div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div className="px-5 py-8 text-center text-text-muted">{t('noResults')}</div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              {Object.entries(grouped).map(([type, items], groupIdx) => (
                <div key={type}>
                  <div className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted/70">
                    {t(`types.${type}`)} ({items.length})
                  </div>
                  {items.map((r, i) => {
                    const globalIdx =
                      items.slice(0, i).reduce(
                        (sum, _, gi) => sum + (Object.values(grouped)[gi]?.length ?? 0),
                        0
                      ) +
                      Object.values(grouped)
                        .slice(0, groupIdx)
                        .reduce((s, g) => s + g.length, 0);
                    return (
                      <Link
                        key={`${r.item.type}-${r.item.href}`}
                        href={`/${locale}${r.item.href}`}
                        onClick={onClose}
                        className={`flex items-start gap-3 px-5 py-3 transition-colors ${
                          globalIdx === activeIndex
                            ? 'bg-bg-ice'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {TYPE_ICONS[r.item.type]}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-text-charcoal truncate">
                            {r.item.title}
                          </div>
                          {r.item.desc && (
                            <div className="text-xs text-text-muted/70 mt-0.5 line-clamp-2">
                              {r.item.desc}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {!loading && !query.trim() && (
            <div className="px-5 py-8 text-center text-text-muted text-sm">
              {t('hint')}
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
