'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, FileText, BookOpen, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useT, useTradeLocale } from './TranslationProvider';
import type { SearchResultItem } from './search';

export type { SearchResultItem };

export type SearchFn = (query: string, locale: string) => Promise<SearchResultItem[]>;

const TYPE_ICONS: Record<string, React.ReactNode> = {
  service: <FileText className="w-4 h-4 text-accent-blue" />,
  blog: <BookOpen className="w-4 h-4 text-accent-gold" />,
  faq: <HelpCircle className="w-4 h-4 text-text-muted" />,
};

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  searchFn: SearchFn;
}

export default function SearchModal({ open, onClose, searchFn }: SearchModalProps) {
  const t = useT('Search');
  const ctxLocale = useTradeLocale();
  const locale = ctxLocale || 'en';
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (!query.trim()) return;
    setLoading(true);
    searchFn(query, locale).then((r) => {
      setResults(r);
      setLoading(false);
    });
  }, [query, locale, searchFn]);

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
        const item = results[activeIndex];
        if (item) {
          window.location.href = `/${locale}${item.href}`;
        }
      }
    },
    [results, activeIndex, locale]
  );

  if (!open) return null;

  // Group results by type
  const grouped: Record<string, SearchResultItem[]> = {};
  for (const r of results) {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  }

  return (
    <>
      {/* Backdrop — click outside to close */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal container — full viewport, centered */}
      <div className="fixed inset-0 z-[101] flex items-start justify-center pt-16 sm:pt-24 px-4 pointer-events-none">
        <div
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
                    {items.map((item, i) => {
                      // Calculate global index across all grouped items
                      let globalIdx = 0;
                      const groupKeys = Object.keys(grouped);
                      for (let g = 0; g < groupIdx; g++) {
                        globalIdx += grouped[groupKeys[g]].length;
                      }
                      globalIdx += i;

                      return (
                        <Link
                          key={`${item.type}-${item.href}`}
                          href={`/${locale}${item.href}`}
                          onClick={onClose}
                          className={`flex items-start gap-3 px-5 py-3 transition-colors ${
                            globalIdx === activeIndex
                              ? 'bg-bg-ice'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="mt-0.5 flex-shrink-0">
                            {TYPE_ICONS[item.type]}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-text-charcoal truncate">
                              {item.title}
                            </div>
                            {item.desc && (
                              <div className="text-xs text-text-muted/70 mt-0.5 line-clamp-2">
                                {item.desc}
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
