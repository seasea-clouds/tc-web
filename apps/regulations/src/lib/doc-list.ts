import type { DocMeta } from './documents';

/** 每页条数（政策条目排版紧凑，一页 20 条足够）。 */
export const PAGE_CAPACITY = 20;

export function paginate(docs: DocMeta[]): DocMeta[][] {
  const pages: DocMeta[][] = [];
  for (let i = 0; i < docs.length; i += PAGE_CAPACITY) {
    pages.push(docs.slice(i, i + PAGE_CAPACITY));
  }
  return pages.length ? pages : [[]];
}

/** 第 1 页就是索引页本身（/regulations/），其余走 /regulations/page/N/。 */
export function pagePath(locale: string, page: number): string {
  return page <= 1 ? `/${locale}/regulations/` : `/${locale}/regulations/page/${page}/`;
}

/** 列表页可按机关与类别筛选；这两个值都是稳定代码，不翻译。 */
export function getIssuers(docs: DocMeta[]): string[] {
  return Array.from(new Set(docs.map((d) => d.issuer).filter(Boolean))).sort();
}

export function getCategories(docs: DocMeta[]): string[] {
  return Array.from(new Set(docs.map((d) => d.category).filter(Boolean))).sort();
}
