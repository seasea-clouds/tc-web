import type { PostMeta } from './posts';

/** Page budget in layout units: a text card costs 1, a cover card costs 2. */
export const PAGE_CAPACITY = 20;

export type ListRow =
  | { kind: 'feature'; big: PostMeta; smalls: PostMeta[] }
  | { kind: 'plain'; posts: PostMeta[] };

/**
 * Group posts into rows **without reordering them**. Posts arrive sorted newest
 * first and DOM order is reading order (left to right, top to bottom), so the
 * visual order always matches the date order.
 *
 * A cover card may only take a wide slot when the next two posts have no cover —
 * that keeps the 1 + 2 flow and the date order at the same time. Any other
 * sequence falls back to two even cards. Rows stretch, so a row that happens to
 * mix a cover card with a text card still ends flush.
 */
export function buildRows(posts: PostMeta[]): ListRow[] {
  const rows: ListRow[] = [];
  let i = 0;
  while (i < posts.length) {
    const head = posts[i];
    const second = posts[i + 1];
    const third = posts[i + 2];
    if (head.cover && second && third && !second.cover && !third.cover) {
      rows.push({ kind: 'feature', big: head, smalls: [second, third] });
      i += 3;
    } else {
      const pair = posts.slice(i, i + 2);
      rows.push({ kind: 'plain', posts: pair });
      i += pair.length;
    }
  }
  return rows;
}

/** Split posts into pages of PAGE_CAPACITY units, keeping the original order. */
export function paginate(posts: PostMeta[]): PostMeta[][] {
  const pages: PostMeta[][] = [];
  let current: PostMeta[] = [];
  let cost = 0;
  for (const post of posts) {
    const weight = post.cover ? 2 : 1;
    if (cost + weight > PAGE_CAPACITY && current.length > 0) {
      pages.push(current);
      current = [];
      cost = 0;
    }
    current.push(post);
    cost += weight;
  }
  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}

/** Path of the nth list page: page 1 is /{locale}/blog/, deeper pages get their own URL. */
export function blogPagePath(locale: string, page: number): string {
  return page <= 1 ? `/${locale}/blog/` : `/${locale}/blog/page/${page}/`;
}

/** Distinct categories present in a post list, sorted. */
export function getCategories(posts: PostMeta[]): string[] {
  const set = new Set<string>();
  for (const post of posts) {
    if (post.category) set.add(post.category);
  }
  return [...set].sort();
}

/** Convert a raw category ("Brand Protection") to its i18n key ("cat_Brand_Protection"). */
export function categoryKey(cat: string): string {
  return 'cat_' + cat.replace(/-/g, '_').replace(/ & /g, '_').replace(/ /g, '_');
}
