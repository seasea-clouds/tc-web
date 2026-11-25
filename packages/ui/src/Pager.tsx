/**
 * Pager — 链接式分页器（48 语言的 insights / regulations 列表共用）
 *
 * 为什么是链接而不是按钮：每一页都有自己的真实 URL，刷新、分享、前进后退都正常，
 * 无 JS 也能用，而且可以被索引（各页带自指 canonical）。
 *
 * 各站的路径规则不同（/insights/page/N/ 与 /regulations/page/N/，第 1 页还要
 * 归并回索引页），所以由调用方传入 pagePath —— 组件本身不猜任何 URL。
 */

export interface PagerProps {
  locale: string;
  currentPage: number;
  /** 总页数；≤1 时组件不渲染（单页没有分页的意义） */
  totalPages: number;
  /** 分页器无障碍名与页码标签前缀（已本地化） */
  paginationText: string;
  prevText: string;
  nextText: string;
  /** 生成某页 URL 的站内规则，例：(locale, n) => `/${locale}/insights/page/${n}/` */
  pagePath: (locale: string, page: number) => string;
}

const ARROW_BASE =
  'flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E9EF] text-[#5F6F7F] transition-colors';
const ARROW_HOVER = 'hover:border-[#B8960C] hover:text-[#B8960C]';
const ARROW_OFF = 'cursor-not-allowed opacity-40';

export default function Pager({
  locale,
  currentPage,
  totalPages,
  paginationText,
  prevText,
  nextText,
  pagePath,
}: PagerProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label={paginationText} className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {currentPage > 1 ? (
        <a
          href={pagePath(locale, currentPage - 1)}
          aria-label={prevText}
          className={`${ARROW_BASE} ${ARROW_HOVER}`}
        >
          {/* rtl:rotate-180 —— 阿拉伯语/希伯来语等 RTL 语言里箭头要朝右 */}
          <svg className="h-4 w-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </a>
      ) : (
        <span aria-hidden="true" className={`${ARROW_BASE} ${ARROW_OFF}`}>
          <svg className="h-4 w-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </span>
      )}

      {pages.map((n) =>
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
        ),
      )}

      {currentPage < totalPages ? (
        <a
          href={pagePath(locale, currentPage + 1)}
          aria-label={nextText}
          className={`${ARROW_BASE} ${ARROW_HOVER}`}
        >
          <svg className="h-4 w-4 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      ) : (
        <span aria-hidden="true" className={`${ARROW_BASE} ${ARROW_OFF}`}>
          <svg className="h-4 w-4 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      )}
    </nav>
  );
}
