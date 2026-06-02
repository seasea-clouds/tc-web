/**
 * Shared client-side search utility.
 * Loads search-index-{locale}.json and performs case-insensitive substring matching.
 */

export interface SearchItem {
  type: 'service' | 'blog' | 'faq';
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
  generated: string;
}

export interface SearchResult {
  item: SearchItem;
  matchIn: 'title' | 'desc' | 'category';
}

let cache: Record<string, SearchIndex | null> = {};

export async function loadSearchIndex(locale: string): Promise<SearchIndex | null> {
  if (cache[locale] !== undefined) return cache[locale];
  try {
    const res = await fetch(`/search-index-${locale}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cache[locale] = data;
    return data;
  } catch {
    cache[locale] = null;
    return null;
  }
}

export function search(
  query: string,
  index: SearchIndex | null,
  maxResults = 15
): SearchResult[] {
  if (!index || !query.trim()) return [];
  const q = query.toLowerCase().trim();
  const results: SearchResult[] = [];
  const allItems: SearchItem[] = [...index.services, ...index.blog, ...index.faq];

  for (const item of allItems) {
    const inTitle = item.title.toLowerCase().includes(q);
    const inDesc = item.desc.toLowerCase().includes(q);
    const inCategory = item.category?.toLowerCase().includes(q);

    if (inTitle) {
      results.push({ item, matchIn: 'title' });
    } else if (inDesc) {
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
  type: 'service' | 'blog' | 'faq';
  title: string;
  desc: string;
  href: string;
}
