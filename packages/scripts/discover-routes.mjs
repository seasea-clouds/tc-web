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

export const LOCALES = [
  'en','zh','es','fr','de','ja','pt','ru',
  'ar','ko','it','nl','tr','vi','id','th',
  'hi','pl','sv','el','cs','ro','hu','fi',
  'da','no','nb','uk','bg','hr','sr','sk','sl',
  'ms','ka','he','sw','bn','ca',
  'fa','ur','ta','af','sq','az','hy','be','ne','si',
  'tl','te',
];

const PRIVATE_SEGMENTS = ['/login','/register','/dashboard','/me/','/report','/api','/auth','/billing','/settings','/subscription'];
const PRIVATE_PATHS = ['/c/login','/c/register','/c/dashboard','/c/me','/c/report','/c/report/preview','/thank-you','/testimonials','/sitemap'];
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

  // 如果指定了子目录（如 blog），只扫描 content/{subdir}/{locale}/*.mdx
  if (subdir) {
    const subContentDir = path.join(contentBase, subdir);
    if (!fs.existsSync(subContentDir)) return instances;
    for (const locale of fs.readdirSync(subContentDir)) {
      const localeDir = path.join(subContentDir, locale);
      if (!fs.statSync(localeDir).isDirectory()) continue;
      for (const file of fs.readdirSync(localeDir)) {
        if (file.endsWith('.mdx')) instances.push(file.replace(/\.mdx$/, ''));
      }
    }
    return [...new Set(instances)];
  }

  // fallback: 扫描 content/{locale}/*.mdx
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
 */
export function discoverAll() {
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
      } else if (!isPrivateRoute(clean)) {
        app.staticRoutes.push(clean.endsWith('/') ? clean : clean + '/');
      }
    }

    app.staticRoutes = [...new Set(app.staticRoutes)].sort();
    result.push(app);
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

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
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
