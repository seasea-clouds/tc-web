/**
 * publish-gate.mjs — 定时发布门禁（构建期唯一判定口径）
 *
 * 规则：mdx frontmatter 的 `date` 晚于站点"今天"（UTC+8）时，该文章视为**未发布**：
 *   - 不生成详情页（apps/blog/src/app/[locale]/blog/[slug]/page.tsx 的 generateStaticParams）
 *   - 不进列表/首页/分类/分页/相关文章（apps/blog/src/lib/posts.ts 的 getPosts）
 *   - 不进 sitemap / llms.txt / known-routes（discover-routes.mjs）
 *   - 不进站点搜索索引（build-search-index.mjs）
 *   - 不进 llms.txt 文章清单（build-llms.mjs）
 *
 * 全部走这一个模块，避免"某处漏了一条"导致未发布稿子从别的入口泄漏。
 * 到发布日后需要一次重新构建，页面才会出现（每日定时构建兜底）。
 */

import fs from 'node:fs';

/** 站点"今天"，UTC+8，YYYY-MM-DD */
export function siteToday() {
  const cst = new Date(Date.now() + 8 * 3600 * 1000);
  return cst.toISOString().slice(0, 10);
}

/** 日期是否已到发布日（当天算已发布）；日期异常时不拦，避免文章凭空消失 */
export function isPublished(date, today = siteToday()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return true;
  return date <= today;
}

/** 从 mdx 源码里读 date（只匹配 frontmatter 第一屏，不做完整 YAML 解析） */
export function readMdxDate(raw) {
  const m = String(raw).match(/^date:\s*"?(\d{4}-\d{2}-\d{2})"?/m);
  return m ? m[1] : '';
}

/** 直接读文件并判断是否已到发布日（读不到/无 date 一律放行） */
export function isFilePublished(file) {
  try {
    return isPublished(readMdxDate(fs.readFileSync(file, 'utf-8')));
  } catch {
    return true;
  }
}
