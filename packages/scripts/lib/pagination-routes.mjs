#!/usr/bin/env node
/**
 * pagination-routes.mjs — 列表分页 URL 的唯一来源（构建期）
 *
 * 第 1 页就是列表页本身（/{locale}/insights/、/{locale}/regulations/），
 * 第 2 页起才有自己的 URL（/page/N/）。这些页面必须可索引（canonical 自指），
 * 所以 sitemap 里要逐个列出来 —— 否则 83 篇法规的 2–5 页、博客的 2 页
 * 就只剩详情页这一个入口。
 *
 * 页数算法与各 app 的 lib 保持一致：
 *   - insights：PAGE_CAPACITY=20，有封面的文章占 2 个权重（insights-list.ts paginate）
 *   - regulations：PAGE_CAPACITY=20，一篇占 1 个（doc-list.ts paginate）
 * 文章还要过 publish-gate（未到发布日的不算），否则会把未来页写进 sitemap。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isFilePublished } from './publish-gate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');

export const PAGE_CAPACITY = 20;

/** 封面按约定路径探测（apps/insights/src/lib/posts.ts getCoverPath），不是 frontmatter 字段 */
function hasCover(slug) {
  return fs.existsSync(path.join(ROOT, 'apps/insights/public/images/insights', slug, 'cover.webp'));
}

/** 博客的页数（按 en 目录的已发布文章算，48 语言篇目一致） */
export function insightsPageCount() {
  const dir = path.join(ROOT, 'apps/insights/content/en');
  if (!fs.existsSync(dir)) return 1;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mdx'));
  let cost = 0;
  for (const f of files) {
    if (!isFilePublished(path.join(dir, f))) continue;
    cost += hasCover(f.replace(/\.mdx$/, '')) ? 2 : 1;
  }
  return Math.max(1, Math.ceil(cost / PAGE_CAPACITY));
}

/** 法规的页数 */
export function regulationsPageCount() {
  const dir = path.join(ROOT, 'apps/regulations/content/en');
  if (!fs.existsSync(dir)) return 1;
  const n = fs.readdirSync(dir).filter((f) => f.endsWith('.mdx')).length;
  return Math.max(1, Math.ceil(n / PAGE_CAPACITY));
}

/** 该 locale 下所有需要进 sitemap 的分页 URL（不含第 1 页） */
export function paginatedRoutes(locale) {
  const out = [];
  const insightsPages = insightsPageCount();
  for (let n = 2; n <= insightsPages; n += 1) out.push(`/${locale}/insights/page/${n}/`);
  const regPages = regulationsPageCount();
  for (let n = 2; n <= regPages; n += 1) out.push(`/${locale}/regulations/page/${n}/`);
  return out;
}
