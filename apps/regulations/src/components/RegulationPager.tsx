import { pagePath } from '@/lib/doc-list';

interface Props {
  locale: string;
  currentPage: number;
  totalPages: number;
  paginationText: string;
  prevText: string;
  nextText: string;
}

/**
 * Link-based pager: every page has its own URL (refresh/share/back-forward all work,
 * and it works without JavaScript). Labels come from the Regulations message namespace.
 */
export default function RegulationPager({ locale, currentPage, totalPages, paginationText, prevText, nextText }: Props) {
  if (totalPages <= 1) return null;

  const arrowBase = 'flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E9EF] text-[#5F6F7F] transition-colors';
  const arrowHover = 'hover:border-[#B8960C] hover:text-[#B8960C]';
  const arrowOff = 'cursor-not-allowed opacity-40';

  return (
    <nav aria-label={paginationText} className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {currentPage > 1 ? (
        <a href={pagePath(locale, currentPage - 1)} aria-label={prevText} className={`${arrowBase} ${arrowHover}`}>
          <svg className="h-4 w-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </a>
      ) : (
        <span aria-hidden="true" className={`${arrowBase} ${arrowOff}`}>
          <svg className="h-4 w-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </span>
      )}

      {Array.from({ length: totalPages }, (_, i) => i + 1).map(n =>
        n === currentPage ? (
          <span
            key={n}
            aria-current="page"
            className="h-10 min-w-10 rounded-full bg-[#B8960C] px-3 text-center text-sm font-semibold leading-10 text-white"
          >
            {n}
          </span>
        ) : (
          <a
            key={n}
            href={pagePath(locale, n)}
            aria-label={`${paginationText} ${n}`}
            className="h-10 min-w-10 rounded-full border border-[#E5E9EF] px-3 text-center text-sm font-semibold leading-10 text-[#333333] transition-colors hover:border-[#B8960C] hover:text-[#B8960C]"
          >
            {n}
          </a>
        )
      )}

      {currentPage < totalPages ? (
        <a href={pagePath(locale, currentPage + 1)} aria-label={nextText} className={`${arrowBase} ${arrowHover}`}>
          <svg className="h-4 w-4 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      ) : (
        <span aria-hidden="true" className={`${arrowBase} ${arrowOff}`}>
          <svg className="h-4 w-4 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      )}
    </nav>
  );
}
