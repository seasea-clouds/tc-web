/**
 * Shared client-side search utility.
 * Loads search-index-{locale}.json and performs case-insensitive substring matching.
 */

export type SearchItemType = 'service' | 'blog' | 'faq' | 'regulation' | 'check';

export interface SearchItem {
  type: SearchItemType;
  title: string;
  desc: string;
  href: string;
  category?: string;
  searchable: string;
}

export interface SearchIndex {
  services: SearchItem[];
  blog: SearchItem[];
  faq: SearchItem[];
  regulations?: SearchItem[];
  checks?: SearchItem[];
  generated: string;
}

export interface SearchResult {
  item: SearchItem;
  matchIn: 'title' | 'desc' | 'category';
}

let cache: Record<string, SearchIndex> = {};
/** 同一个 locale 的并发请求共享一个 Promise，避免每次按键都打一次网络 */
let inflight: Record<string, Promise<SearchIndex | null> | undefined> = {};
/** 上次失败的时间戳：失败不永久缓存，30 秒后可重试 */
let failedAt: Record<string, number> = {};
const RETRY_AFTER_MS = 30_000;

/**
 * 索引加载。
 *
 * 曾经的写法是「失败 → cache[locale] = null → 永久返回 null」，
 * 结果 CF 边缘偶发 403（页面刚加载时并发请求多，WAF 会拦）一次之后，
 * 本次会话的站内搜索就彻底空了，用户只能刷新页面。
 * 现在：失败只记时间戳，30 秒后自动重试；成功的索引长期缓存。
 */
export async function loadSearchIndex(locale: string): Promise<SearchIndex | null> {
  const hit = cache[locale];
  if (hit) return hit;

  const failed = failedAt[locale];
  if (failed && Date.now() - failed < RETRY_AFTER_MS) return null;

  const pending = inflight[locale];
  if (pending) return pending;

  const task = (async (): Promise<SearchIndex | null> => {
    try {
      const res = await fetch(`/search-index-${locale}.json`, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as SearchIndex;
      cache[locale] = data;
      delete failedAt[locale];
      return data;
    } catch {
      failedAt[locale] = Date.now();
      return null;
    } finally {
      delete inflight[locale];
    }
  })();

  inflight[locale] = task;
  return task;
}

export function search(
  query: string,
  index: SearchIndex | null,
  maxResults = 15
): SearchResult[] {
  if (!index || !query.trim()) return [];
  const q = query.toLowerCase().trim();
  const results: SearchResult[] = [];
  const allItems: SearchItem[] = [
    ...index.services,
    ...index.blog,
    ...index.faq,
    ...(index.regulations ?? []),
    ...(index.checks ?? []),
  ];

  for (const item of allItems) {
    const inTitle = item.title.toLowerCase().includes(q);
    const inDesc = item.desc.toLowerCase().includes(q);
    const inCategory = item.category?.toLowerCase().includes(q);
    // searchable 里另外拼了法规文号与发布机构（GACC Announcement No. 156 / SC），
    // 这些用户会直接搜，但页面正文摘要里没有。
    const inExtra = (item.searchable || '').includes(q);

    if (inTitle) {
      results.push({ item, matchIn: 'title' });
    } else if (inDesc || inExtra) {
      results.push({ item, matchIn: 'desc' });
    } else if (inCategory) {
      results.push({ item, matchIn: 'category' });
    }
  }

  const order: Record<string, number> = { title: 0, desc: 1, category: 2 };
  results.sort((a, b) => (order[a.matchIn] ?? 0) - (order[b.matchIn] ?? 0));
  return results.slice(0, maxResults);
}

export function clearCache() {
  cache = {};
  inflight = {};
  failedAt = {};
}

/** Default search function: loads search index and searches. */
export async function defaultSearch(
  query: string,
  locale: string
): Promise<SearchResultItem[]> {
  const index = await loadSearchIndex(locale);
  if (!index) return [];
  const results = search(query, index);
  return results.map((r) => ({
    type: r.item.type,
    title: r.item.title,
    desc: r.item.desc,
    href: r.item.href,
  }));
}

export interface SearchResultItem {
  type: SearchItemType;
  title: string;
  desc: string;
  href: string;
}
