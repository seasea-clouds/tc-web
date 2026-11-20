// insights-content.ts — 站点站（site）在**构建期**读取 insights 文章清单
//
// 用途只有两个：`/{locale}/sitemap/` 的 Insights 分区、`/{locale}/thank-you/` 的推荐阅读。
// 都是静态导出时的服务端读取，不产生任何运行时耦合。
//
// 数据源是 `apps/insights/content/<locale>/*.mdx`（唯一真源）。site 不复制内容，
// 只读 frontmatter 的 title / date / category / excerpt。发布门禁与 insights app
// 完全一致（UTC+8 当天算已发布，日期异常时放行），避免站内地图出现未到日的稿子。

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface InsightsPostMeta {
  slug: string;
  title: string;
  date: string;
  category: string;
  excerpt: string;
  cover?: string;
}

/** site 构建时 cwd = apps/site，内容在同级 insights app 下 */
const CONTENT_ROOT = path.resolve(process.cwd(), '..', 'insights', 'content');

/** 站点"今天"，UTC+8，YYYY-MM-DD */
function siteToday(): string {
  const cst = new Date(Date.now() + 8 * 3600 * 1000);
  return cst.toISOString().slice(0, 10);
}

/** 日期异常时不拦，避免文章凭空消失（与 packages/scripts/lib/publish-gate.mjs 同口径） */
function isPublished(date: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return true;
  return date <= today;
}

/** 该语言已发布的文章，按日期倒序 */
export function getPublishedInsights(locale: string): InsightsPostMeta[] {
  const dir = path.join(CONTENT_ROOT, locale);
  if (!fs.existsSync(dir)) return [];

  const today = siteToday();
  const out: InsightsPostMeta[] = [];

  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.mdx')) continue;
    const slug = file.slice(0, -4);
    try {
      const { data } = matter(fs.readFileSync(path.join(dir, file), 'utf-8'));
      const date = String(data.date ?? '');
      if (!isPublished(date, today)) continue;
      out.push({
        slug,
        title: String(data.title ?? slug),
        date,
        category: String(data.category ?? ''),
        excerpt: String(data.excerpt ?? ''),
        cover: data.cover ? String(data.cover) : undefined,
      });
    } catch {
      // 解析失败的文章不列进站内地图，不影响整页构建
      continue;
    }
  }

  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
