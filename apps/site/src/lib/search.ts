/**
 * Client-side search library.
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
  // Highlight positions (which part matched)
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

export function search(query: string, index: SearchIndex | null, maxResults = 15): SearchResult[] {
  if (!index || !query.trim()) return [];

  const q = query.toLowerCase().trim();
  const results: SearchResult[] = [];

  // Search all items
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

  // Sort: title matches first, then desc, then category
  const order: Record<string, number> = { title: 0, desc: 1, category: 2 };
  results.sort((a, b) => (order[a.matchIn] ?? 0) - (order[b.matchIn] ?? 0));

  return results.slice(0, maxResults);
}

export function clearCache() {
  cache = {};
}
