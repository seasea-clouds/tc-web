#!/usr/bin/env node
/**
 * discover-routes.mjs - 自动发现 trade-web 所有子站路由
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const APPS_DIR = path.join(ROOT, 'apps');

import { LOCALES } from './locales.mjs';

// Re-export so build-sitemap.mjs / build-llms.mjs can still import from here
export { LOCALES };

const PRIVATE_SEGMENTS = ['/login','/register','/me/','/report','/api','/auth','/billing','/settings','/subscription'];
const PRIVATE_PATHS = ['/c/login','/c/register','/c/me','/c/report','/c/report/preview','/thank-you','/testimonials','/sitemap','/ai-assistance'];
const ROUTE_GROUP_RE = /\([^)]+\)\//g;

function scanPageTsx(appDir) {
  const pages = [];
  const srcApp = path.join(appDir, 'src', 'app');
  if (!fs.existsSync(srcApp)) return pages;
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'page.tsx') pages.push(full);
    }
  }
  walk(srcApp);
  return pages;
}

function extractRoutePattern(pagePath, appDir) {
  return pagePath
    .replace(path.join(appDir, 'src', 'app'), '')
    .replace(/\/page\.tsx$/, '')
    .replace(ROUTE_GROUP_RE, '')
    .replace(/^\/+/, '/');
}

function isDynamicRoute(route) {
  return route.includes('[') && route.includes(']');
}

function isPrivateRoute(route) {
  if (PRIVATE_PATHS.includes(route)) return true;
  return PRIVATE_SEGMENTS.some(seg => route.startsWith(seg) || route.includes(seg));
}

/**
 * 从动态路由模式提取内容子目录
 * /[locale]/blog/[slug]  → content/blog/
 */
function extractContentSubdir(pattern) {
  const parts = pattern.split('/');
  // 找 [locale] 之后的第一个非动态段
  let foundLocale = false;
  for (const p of parts) {
    if (p === '[locale]') { foundLocale = true; continue; }
    if (foundLocale && p && !p.startsWith('[')) return p;
  }
  return null;
}

function discoverDynamicInstances(appDir, subdir) {
  const instances = [];
  const contentBase = path.join(appDir, 'content');
  if (!fs.existsSync(contentBase)) return instances;

  // 如果指定了子目录（如 blog），先扫描 content/{subdir}/{locale}/*.mdx
  if (subdir) {
    const subContentDir = path.join(contentBase, subdir);
    if (fs.existsSync(subContentDir)) {
      for (const locale of fs.readdirSync(subContentDir)) {
        const localeDir = path.join(subContentDir, locale);
        if (!fs.statSync(localeDir).isDirectory()) continue;
        for (const file of fs.readdirSync(localeDir)) {
          if (file.endsWith('.mdx')) instances.push(file.replace(/\.mdx$/, ''));
        }
      }
      return [...new Set(instances)];
    }
  }

  // fallback: 扫描 content/{locale}/*.mdx（扁平结构）
  // 也用于 industry slug 从 data 文件读取
  for (const locale of fs.readdirSync(contentBase)) {
    const localeDir = path.join(contentBase, locale);
    if (!fs.statSync(localeDir).isDirectory()) continue;
    for (const file of fs.readdirSync(localeDir)) {
      if (file.endsWith('.mdx')) instances.push(file.replace(/\.mdx$/, ''));
    }
  }
  return [...new Set(instances)];
}

/**
 * 发现所有子站及其路由
 * @param {boolean} includePrivate 是否保留私有路由（login/register/me/report 等）。
 *   false（默认）：sitemap/llms 等对外场景，排除私有页；
 *   true：known-routes 名单生成场景，需要全量真实存在页面（含转化路径 report 等）。
 */
export function discoverAll(includePrivate = false) {
  const apps = fs.readdirSync(APPS_DIR)
    .filter(n => fs.existsSync(path.join(APPS_DIR, n, 'package.json')))
    .sort();

  const result = [];
  for (const appName of apps) {
    if (appName === 'admin') continue;
    const appDir = path.join(APPS_DIR, appName);
    const pages = scanPageTsx(appDir);
    const app = {
      name: appName,
      dir: appDir,
      hasContent: fs.existsSync(path.join(appDir, 'content')),
      staticRoutes: [],
      dynamicRoutes: [],
    };

    for (const pagePath of pages) {
      const raw = extractRoutePattern(pagePath, appDir);
      if (raw === '' || raw === '/') continue;

      const clean = raw.replace(/^\/\[locale\](\/|$)/, '/').replace(/^\/$/, '');
      if (clean === '' || clean === '/') continue;

      if (isDynamicRoute(clean)) {
        const paramMatch = clean.match(/\[(\w+)\]/);
        if (!paramMatch) continue;
        const subdir = extractContentSubdir(raw);
        const instances = discoverDynamicInstances(appDir, subdir);
        // 只保留有实例的动态路由
        if (instances.length > 0) {
          app.dynamicRoutes.push({
            prefix: clean.replace(/\/\[\w+\]\/?$/, ''), // /blog
            param: paramMatch[1],
            instances,
          });
        }
      } else if (includePrivate || !isPrivateRoute(clean)) {
        app.staticRoutes.push(clean.endsWith('/') ? clean : clean + '/');
      }
    }

    app.staticRoutes = [...new Set(app.staticRoutes)].sort();
    result.push(app);
  }

  // Post-process: discover industry page slugs from data file for site app
  const siteApp = result.find(a => a.name === 'site');
  if (siteApp) {
    const siteDataPath = path.join(APPS_DIR, 'site', 'src', 'data', 'industries.ts');
    const uiDataPath = path.join(ROOT, 'packages', 'ui', 'src', 'data', 'industries.ts');
    for (const dataPath of [siteDataPath, uiDataPath]) {
      if (fs.existsSync(dataPath)) {
        const dataContent = fs.readFileSync(dataPath, 'utf-8');
        const slugMatches = [...dataContent.matchAll(/slug:\s*['"]([^'"]+)['"]/g)];
        const slugs = [...new Set(slugMatches.map(m => m[1]))];
        if (slugs.length > 0) {
          // Add industry dynamic routes
          siteApp.dynamicRoutes.push({
            prefix: '/industries',
            param: 'industry',
            instances: slugs,
          });
          break;
        }
      }
    }
  }
  return result;
}

/**
 * 展开多语言路由
 */
export function expandLocales(apps) {
  const map = {};
  for (const locale of LOCALES) map[locale] = [];

  for (const app of apps) {
    for (const locale of LOCALES) {
      for (const route of app.staticRoutes) {
        map[locale].push(route === '/' ? `/${locale}/` : `/${locale}${route}`);
      }
      for (const dr of app.dynamicRoutes) {
        for (const slug of dr.instances) {
          map[locale].push(`/${locale}${dr.prefix}/${slug}/`);
        }
      }
    }
  }

  return Object.entries(map).map(([locale, routes]) => ({
    locale,
    routes: [...new Set(routes)].sort(),
  }));
}

/**
 * 生成「真实存在路由名单」并写入 admin analytics 使用的 known-routes.ts。
 *
 * 用途：热门页面（page_paths）的路由存在性校验。构建时动态生成，
 * 每次部署自动重新扫描所有子站 src/app 下的 page.tsx + content/*.mdx，
 * 新增页面/子站/博客文章自动纳入，无需手维护静态名单。
 *
 * 与 expandLocales 的区别：
 * - includePrivate=true：保留 login/register/me/report 等真实存在页面
 *   （report 是核心转化路径，热门页面需要展示）
 * - 额外包含根路径 / 与 locale-only 首页 /{locale}/
 * - 输出归一化形式（去尾斜杠），便于与 CF Analytics 记录的 path 匹配
 *
 * 输出：apps/admin/functions/lib/known-routes.ts
 */
export function emitKnownRoutes() {
  const apps = discoverAll(true); // includePrivate：热门页面展示所有真实页面
  const routes = new Set();

  // 根路径与 locale-only 首页（discoverAll 会跳过空路由，这里手动补）
  routes.add('/');
  for (const locale of LOCALES) routes.add(`/${locale}`);

  for (const app of apps) {
    for (const locale of LOCALES) {
      for (const route of app.staticRoutes) {
        routes.add(`/${locale}${route === '/' ? '' : route}`.replace(/\/+$/, ''));
      }
      for (const dr of app.dynamicRoutes) {
        for (const slug of dr.instances) {
          routes.add(`/${locale}${dr.prefix}/${slug}`.replace(/\/+$/, ''));
        }
      }
    }
  }

  const sorted = [...routes].sort();
  const OUTPUT_FILE = path.join(ROOT, 'apps/admin/functions/lib/known-routes.ts');
  const lines = [
    '// AUTO-GENERATED — do not edit manually',
    `// Generated by packages/scripts/discover-routes.mjs at ${new Date().toISOString().slice(0, 10)}`,
    `// Source: ${apps.length} apps (site/portal/blog) scanned from src/app/**/page.tsx + content/*.mdx`,
    `// ${sorted.length} routes across ${LOCALES.length} locales (normalized, no trailing slash)`,
    '//',
    '// 用途：admin analytics 热门页面（page_paths）的路由存在性校验。',
    '// 每次部署构建时自动重新生成，新增页面/子站/博客文章自动纳入。',
    '//',
    "export const KNOWN_ROUTES: string[] = [",
    ...sorted.map((r) => `  '${r}',`),
    '];',
    '',
  ];

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, lines.join('\n'), 'utf-8');
  console.log(`\n✅ Generated ${OUTPUT_FILE}`);
  console.log(`   ${sorted.length} known routes (${LOCALES.length} locales, includePrivate=true)`);
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--emit-json')) {
    emitKnownRoutes();
    process.exit(0);
  }
  const apps = discoverAll();
  console.log('=== Discovered Apps ===');
  for (const a of apps) {
    console.log(`\n${a.name}:`);
    console.log(`  static [${a.staticRoutes.length}]: ${JSON.stringify(a.staticRoutes)}`);
    console.log(`  dynamic [${a.dynamicRoutes.length}]: ${JSON.stringify(a.dynamicRoutes)}`);
  }
  const expanded = expandLocales(apps);
  console.log(`\n=== Expanded (${expanded.length} locales, ${expanded[0].routes.length} routes/en) ===`);
  console.log(expanded.find(e => e.locale === 'en').routes.join('\n'));
}
