/**
 * D1 caching layer for CF Analytics data.
 *
 * Strategy:
 *   - Historical days (yesterday and earlier) never change → cache in D1 permanently
 *   - Today's completed hours → cache in D1 as they finish
 *   - On each request: check what's missing in D1, fetch from CF, store
 *   - Once cached, data is never re-fetched (unless forceRefresh)
 */

import {
  hasConfig,
  getApiToken,
  getZoneId,
  fetchDailyStats,
  fetchHourlyStats,
  fetchAggregateStatsRange,
  fetchHourlyAggregateStats,
  inferProject,
  type HourlyStats,
} from "./cf-analytics";

import { KNOWN_ROUTES, KNOWN_ROUTE_PATTERNS } from "./known-routes";

// 归一化后的路由集合（去尾斜杠），用于 O(1) 存在性查找
const KNOWN_ROUTE_SET = new Set(KNOWN_ROUTES);

/** 分页路由（/insights/page/{n}/）实例随文章增长，按正则校验而非枚举。 */
function matchesKnownPattern(route: string): boolean {
  return KNOWN_ROUTE_PATTERNS.some((re) => re.test(route));
}

/**
 * 路径归一化：去尾斜杠，保留 locale 前缀，与 known-routes 名单匹配。
 * /en/about/ → /en/about；/  → /（根路径特殊保留）
 */
export function normalizeRoute(path: string): string {
  const clean = path.replace(/\/+$/, "");
  return clean === "" ? "/" : clean;
}

interface CacheEnv {
  DB: any;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ZONE_ID?: string;
}

// ── Schema ───────────────────────────────────────────────────────

interface DailyRow {
  date: string;
  total_pv: number;
  total_uv: number;
  total_requests: number;
  total_bytes: number;
  cached_requests: number;
  countries_count: number;
  geo_data: string;
  browser_data: string;
  status_code_data: string;
  os_data: string;
  device_data: string;
  page_data: string;
  /** JSON array of page-only paths (filtered by routing architecture) */
  page_paths: string;
  project_data: string;
  source: string;
}

// ── Helpers ──────────────────────────────────────────────────────

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayUTC(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function nextDate(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function formatISO(date: string, hour: number): string {
  const h = String(hour).padStart(2, "0");
  return `${date}T${h}:00:00Z`;
}

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const s = new Date(start + "T00:00:00Z");
  const e = new Date(end + "T00:00:00Z");
  while (s <= e) {
    dates.push(s.toISOString().slice(0, 10));
    s.setDate(s.getDate() + 1);
  }
  return dates;
}

/**
 * 面包屑语法路径判定（用于「热门路径」page_data 的写入过滤）。
 *
 * 要求：
 * - 属于已知子站架构（site/portal/insights/regulations/admin/api），排除 unknown 噪音
 * - 无文件扩展名（排除静态资源 / RSC tree 等非页面路径）
 * - 非 Next.js 内部路径（_next）
 *
 * 注意：扫描器噪音不在这里处理——数据源已按 HTTP 状态码 2xx/3xx
 * 动态过滤（404 探测请求不会进入聚合）。
 */
export function isBreadcrumbPath(path: string): boolean {
  if (inferProject(path).project === "unknown") return false;
  if (path.includes(".")) return false;
  if (path.includes("_next")) return false;
  return true;
}

export function safeJSON<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * 判断一个请求路径是否为面向用户的页面路径（用于「热门页面」榜单）。
 *
 * 判断逻辑（按顺序）：
 * 1. 根据 inferProject() 识别路由架构，排除非页面的子站（admin、api）
 * 2. 排除 Next.js 内部路径（_next、__nextjs）
 * 3. 排除所有带扩展名的路径（自动覆盖全部扩展名）
 * 4. 排除隐藏文件（以点开头的段）
 * 5. 路由存在性校验：路径必须存在于构建时动态生成的 known-routes 名单
 *    （扫描 src/app 全部 page.tsx + content 动态实例 + 48 locale 展开）
 *
 * 【扫描器噪音不在这里处理】—— 非法路径统一返回 404，已在数据源
 * （fetchAggregateStatsRange / fetchHourlyAggregateStats）按 HTTP 状态码
 * 2xx/3xx 过滤，动态排除，无需静态名单。
 *
 * 【known-routes 名单是动态生成的】每次部署构建时由 discover-routes.mjs
 * 重新扫描全部子站，新增页面/子站/博客文章自动纳入，无需手动维护。
 *
 * 「热门路径」不受此函数影响，它展示所有路径的原始请求次数。
 * 此函数仅用于从全部路径中筛选出「页面」路径，存入 page_paths 字段。
 *
 * ════════════════════════════════════════════════════════
 * 【⚠️ 新增子站时】不需要改这里，只需在 inferProject()
 * 中添加一行并正确设置 isPage 即可，此函数自动继承。
 * ════════════════════════════════════════════════════════
 */
export function isPagePath(path: string): boolean {
  // 第 1 步：路由架构识别 —— 排除非页面子站（admin/api）
  const { isPage } = inferProject(path);
  if (!isPage) return false;

  // 第 2 步：排除 Next.js 内部路径
  const clean = path.replace(/\/+$/, "");
  if (clean.startsWith("/_next/") || clean.startsWith("/__nextjs")) return false;

  // 第 3 步：带扩展名的路径都不是页面（自动覆盖所有扩展名）
  // 对于 Next.js SSG 站点，所有页面路径均为无点号的纯路由
  if (clean.includes(".")) return false;

  // 第 4 步：排除隐藏文件（以点开头的路径段）
  if (clean.split("/").some((seg) => seg.startsWith("."))) return false;

  // 第 5 步：路由存在性校验 —— 必须是真实存在的页面路由
  // （构建时动态生成的 known-routes 名单，含 48 locale 全量展开）
  const normalized = normalizeRoute(path);
  if (!KNOWN_ROUTE_SET.has(normalized) && !matchesKnownPattern(normalized)) return false;

  return true;
}

// ── D1 Schema Migration ──────────────────────────────────────────

export async function runMigration(env: CacheEnv): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS daily_page_stats (
      date TEXT PRIMARY KEY,
      total_pv INTEGER DEFAULT 0,
      total_uv INTEGER DEFAULT 0,
      total_requests INTEGER DEFAULT 0,
      total_bytes INTEGER DEFAULT 0,
      cached_requests INTEGER DEFAULT 0,
      countries_count INTEGER DEFAULT 0,
      geo_data TEXT DEFAULT '[]',
      browser_data TEXT DEFAULT '[]',
      status_code_data TEXT DEFAULT '[]',
      os_data TEXT DEFAULT '[]',
      device_data TEXT DEFAULT '[]',
      page_data TEXT DEFAULT '[]',
      project_data TEXT DEFAULT '[]',
      source TEXT DEFAULT 'cf_api',
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    // 当日实时数据（每小时由 cron 刷新 + API 读穿透时按 5 分钟缓存刷新）。
    // 用途：today 视图的 PV/UV 必须是 CF 当日的真实窗口值，
    // 不能用「24 个小时的 UV 相加」—— UV 是唯一访客，跨时段不可加总。
    `CREATE TABLE IF NOT EXISTS live_today_stats (
      date TEXT PRIMARY KEY,
      pv INTEGER DEFAULT 0,
      uv INTEGER DEFAULT 0,
      requests INTEGER DEFAULT 0,
      fetched_at INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS hourly_page_stats (
      date TEXT NOT NULL,
      hour INTEGER NOT NULL,
      pv INTEGER DEFAULT 0,
      uv INTEGER DEFAULT 0,
      requests INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (date, hour)
    )`,
    // 200 口径列（2026-11-24）：只统计响应码 200 的独立访客与请求数。
    // CF 的 uniq.uniques 无法按状态码切分，值由 adaptiveGroups 按 clientIP 分组得到
    // （见 cf-analytics.ts 的 fetchStatus200Window）。旧行为 NULL，读取时回退旧口径。
    `ALTER TABLE daily_page_stats ADD COLUMN uv_200 INTEGER`,
    `ALTER TABLE daily_page_stats ADD COLUMN requests_200 INTEGER`,
    `ALTER TABLE hourly_page_stats ADD COLUMN uv_200 INTEGER`,
    `ALTER TABLE hourly_page_stats ADD COLUMN requests_200 INTEGER`,
    // Safe ALTER TABLE for columns that might not exist
    `ALTER TABLE daily_page_stats ADD COLUMN page_data TEXT DEFAULT '[]'`,
    `ALTER TABLE daily_page_stats ADD COLUMN project_data TEXT DEFAULT '[]'`,
    `ALTER TABLE daily_page_stats ADD COLUMN page_paths TEXT DEFAULT '[]'`,
    `ALTER TABLE daily_page_stats ADD COLUMN device_data TEXT DEFAULT '[]'`,
    // Hourly distribution columns (added 2026-07-22: today mode charts)
    `ALTER TABLE hourly_page_stats ADD COLUMN geo_data TEXT DEFAULT '[]'`,
    `ALTER TABLE hourly_page_stats ADD COLUMN browser_data TEXT DEFAULT '[]'`,
    `ALTER TABLE hourly_page_stats ADD COLUMN os_data TEXT DEFAULT '[]'`,
    `ALTER TABLE hourly_page_stats ADD COLUMN device_data TEXT DEFAULT '[]'`,
    `ALTER TABLE hourly_page_stats ADD COLUMN page_data TEXT DEFAULT '[]'`,
    `ALTER TABLE hourly_page_stats ADD COLUMN page_paths TEXT DEFAULT '[]'`,
    `ALTER TABLE hourly_page_stats ADD COLUMN project_data TEXT DEFAULT '[]'`,
  ];
  for (const sql of statements) {
    try {
      await env.DB.prepare(sql).run();
    } catch {
      // Column already exists — safe to ignore
    }
  }
}

// ── CF Data Fetching + D1 Caching ────────────────────────────────

/**
 * Ensure historical daily stats are cached in D1.
 * Finds the gap between the last cached date and yesterday,
 * fetches missing daily+aggregate data from CF, and stores it.
 *
 * Returns empty string on success, or error message on failure.
 */
export async function ensureDailyCFCache(env: CacheEnv): Promise<string> {
  if (!hasConfig(env)) return "CF Analytics not configured";

  const zoneId = getZoneId(env);
  const token = getApiToken(env);
  const yesterday = yesterdayUTC();

  // Find the last date that was cached
  const lastRow: any = await env.DB.prepare(
    "SELECT MAX(date) as lastDate FROM daily_page_stats WHERE source = 'cf_api'",
  ).first();
  const lastFetched: string | null = lastRow?.lastDate || null;

  // Determine which dates need fetching
  let missingDates: string[];
  if (!lastFetched) {
    // No data at all — start from a safe early date
    missingDates = dateRange("2026-06-01", yesterday);
  } else if (lastFetched >= yesterday) {
    return ""; // Already up to date
  } else {
    missingDates = dateRange(lastFetched, yesterday);
    // Remove lastFetched itself (already have it)
    if (missingDates[0] === lastFetched) missingDates.shift();
  }

  if (missingDates.length === 0) return "";

  // ── Step 1: Fetch and cache daily PV/UV/geo/browser/status ──
  const fetchedDates = [...missingDates]; // dates we tried to fetch
  try {
    // status200 走 adaptiveGroups 的 clientIP 分组（约 1.5s/天）。
    // CF 的高基数维度只保留约 22 天，更早的窗口会被裁剪成假数据
    // （fetchStatus200Window 内部还有 reliable 判断兜底）→ 窗口外干脆不查。
    const dailyStats = await fetchDailyStats(zoneId, token, missingDates, {
      status200: missingDates.length <= 21,
    });

    for (const ds of dailyStats) {
      if (ds.pv === 0 && ds.requests === 0) {
        // No traffic — still insert a row so we don't re-query
        await env.DB.prepare(
          `INSERT OR REPLACE INTO daily_page_stats
           (date, total_pv, total_uv, total_requests, uv_200, requests_200, source)
           VALUES (?, 0, 0, 0, 0, 0, 'cf_api')`,
        )
          .bind(ds.date)
          .run();
        continue;
      }

      await env.DB.prepare(
        `INSERT OR REPLACE INTO daily_page_stats
         (date, total_pv, total_uv, total_requests, total_bytes, cached_requests,
          countries_count, geo_data, browser_data, status_code_data, uv_200, requests_200, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cf_api')`,
      )
        .bind(
          ds.date,
          ds.pv,
          ds.uv,
          ds.requests,
          ds.bytes,
          ds.cachedRequests,
          ds.countryMap.length,
          JSON.stringify(
            ds.countryMap.map((c: any) => ({
              country: c.clientCountryName,
              count: c.requests,
            })),
          ),
          JSON.stringify(
            ds.browserMap.map((b: any) => ({
              browser: b.uaBrowserFamily,
              pageViews: b.pageViews,
            })),
          ),
          JSON.stringify(
            ds.statusCodeMap.map((s: any) => ({
              status: String(s.edgeResponseStatus),
              count: s.requests,
            })),
          ),
          ds.uv200 ?? null,
          ds.requests200 ?? null,
        )
        .run();
    }
  } catch (err) {
    const msg = `ensureDailyCFCache(daily) failed: ${err}`;
    console.error("[d1-cache]", msg);
    return msg;
  }

  // ── Step 2: Fetch and cache aggregate stats (paths, OS, device, project) ──
  if (missingDates.length > 0 && fetchedDates.length > 0) {
    const firstDate = fetchedDates[0];
    const lastDate = fetchedDates[fetchedDates.length - 1];
    try {
      const aggMap = await fetchAggregateStatsRange(zoneId, token, firstDate, lastDate);
      for (const [date, agg] of Array.from(aggMap.entries())) {
        try {
          // 面包屑语法过滤：仅保留已知子站架构、无扩展名、非 _next 的路径；
          // 扫描器噪音已由数据源状态码 2xx/3xx 动态过滤，无需静态名单。
          const knownPaths = agg.pathData.filter((p) => isBreadcrumbPath(p.path));
          const pagePaths = knownPaths.filter((p) => isPagePath(p.path)).slice(0, 30);

          await env.DB.prepare(
            `UPDATE daily_page_stats
             SET page_data = ?, page_paths = ?, os_data = ?, device_data = ?, project_data = ?
             WHERE date = ? AND source = 'cf_api'`,
          )
            .bind(
              JSON.stringify(knownPaths),
              JSON.stringify(pagePaths),
              JSON.stringify(agg.osData),
              JSON.stringify(agg.deviceData),
              JSON.stringify(agg.projectData),
              date,
            )
            .run();
        } catch (innerErr) {
          console.error(`[d1-cache] agg update failed for ${date}:`, innerErr);
        }
      }
    } catch (err) {
      const msg = `ensureDailyCFCache(agg) failed: ${err}`;
      console.error("[d1-cache]", msg);
      return msg;
    }
  }

  return "";
}

/**
 * Ensure hourly stats are cached in D1 for today's completed hours
 * and historical dates within CF's hourly retention window (~3 days).
 *
 * Strategy:
 *   1. Today's completed hours: incremental — only fetch missing hours
 *   2. Historical dates within retention window: batch fetch all hours,
 *      INSERT OR REPLACE (idempotent)
 */
export async function ensureHourlyCFCache(env: CacheEnv): Promise<void> {
  if (!hasConfig(env)) return;

  const zoneId = getZoneId(env);
  const token = getApiToken(env);
  const now = new Date();
  const today = todayUTC();
  const currentHour = now.getUTCHours();

  // ── Step 1: Today's completed hours ──
  if (currentHour >= 1) {
    // Find which hours are already cached
    const existing: any = await env.DB.prepare(
      "SELECT DISTINCT hour FROM hourly_page_stats WHERE date = ?",
    )
      .bind(today)
      .all();
    const existingHours = new Set<number>(
      (existing.results || []).map((r: any) => r.hour),
    );

    // Find missing completed hours (0 to currentHour-1)
    const missingHours: number[] = [];
    for (let h = 0; h < currentHour; h++) {
      if (!existingHours.has(h)) missingHours.push(h);
    }

    if (missingHours.length > 0) {
      const startHour = Math.min(...missingHours);
      const startISO = formatISO(today, startHour);
      const endHour = Math.max(...missingHours) + 1;
      // Use nextDate() for end hour to avoid T24:00:00Z (invalid ISO 8601)
      const endISO =
        endHour < 24
          ? formatISO(today, endHour)
          : formatISO(nextDate(today), 0);

      try {
        const hourlyStats = await fetchHourlyStats(zoneId, token, startISO, endISO, { status200: true });
        for (const hs of hourlyStats) {
          if (missingHours.includes(hs.hour)) {
            // Store PV/UV + geo/browser from 1hGroups
            await env.DB.prepare(
              `INSERT OR REPLACE INTO hourly_page_stats (date, hour, pv, uv, requests, geo_data, browser_data, uv_200, requests_200)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
              .bind(
                today,
                hs.hour,
                hs.pv,
                hs.uv,
                hs.requests,
                JSON.stringify(hs.countryMap?.map((c) => ({
                  country: c.clientCountryName,
                  count: c.requests,
                })) || []),
                JSON.stringify(hs.browserMap?.map((b) => ({
                  browser: b.uaBrowserFamily,
                  pageViews: b.pageViews,
                })) || []),
                hs.uv200 ?? null,
                hs.requests200 ?? null,
              )
              .run();
          }
        }
      } catch (err) {
        console.error(`[d1-cache] fetchHourlyStats failed for ${today}:`, err);
      }
    }

    // ── Step 1b: Fetch distribution data (OS/device/pages/project) for today's completed hours ──
    const distHours: number[] = [];
    for (let h = 0; h < currentHour; h++) {
      if (!existingHours.has(h)) distHours.push(h);
    }

    for (const h of distHours) {
      try {
        const agg = await fetchHourlyAggregateStats(zoneId, token, today, h);
        if (agg.pathData.length > 0 || agg.osData.length > 0) {
          // 面包屑语法过滤（同 daily 写入）。
          const knownPaths = agg.pathData.filter((p) => isBreadcrumbPath(p.path));
          const pagePaths = knownPaths.filter((p) => isPagePath(p.path)).slice(0, 30);

          await env.DB.prepare(
            `UPDATE hourly_page_stats
             SET os_data = ?, device_data = ?, page_data = ?, page_paths = ?, project_data = ?
             WHERE date = ? AND hour = ?`,
          )
            .bind(
              JSON.stringify(agg.osData),
              JSON.stringify(agg.deviceData),
              JSON.stringify(knownPaths),
              JSON.stringify(pagePaths),
              JSON.stringify(agg.projectData),
              today,
              h,
            )
            .run();
        }
      } catch (err) {
        console.error(`[d1-cache] fetchHourlyAggregateStats failed for ${today} hour ${h}:`, err);
      }
    }
  }

  // ── Step 2: Historical hourly backfill (within CF ~3-day retention) ──
  // httpRequests1hGroups Free plan retention is ~3 days
  // We query each date INDIVIDUALLY so a single out-of-retention date
  // doesn't cause all other dates to fail.
  const retentionDays = 3;
  const cutoff = new Date(now.getTime() - retentionDays * 86400000);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  // Get dates from daily_page_stats that fall within the retention window
  const dailyRows: any = await env.DB.prepare(
    "SELECT DISTINCT date FROM daily_page_stats WHERE date >= ? ORDER BY date",
  )
    .bind(cutoffDate)
    .all();
  const historicalDates = (dailyRows.results || [])
    .map((r: any) => r.date)
    .filter((d: string) => d !== today);

  if (historicalDates.length === 0) return;

  // Query each date individually so retention-expired dates fail gracefully
  for (const date of historicalDates) {
    const startISO = formatISO(date, 0);
    const endISO = formatISO(nextDate(date), 0);
    // endISO uses nextDate() because formatISO(date, 24) produces
    // invalid ISO 8601 (T24:00:00Z)

    try {
      const hourlyStats = await fetchHourlyStats(zoneId, token, startISO, endISO);
      for (const hs of hourlyStats) {
        await env.DB.prepare(
          `INSERT OR REPLACE INTO hourly_page_stats (date, hour, pv, uv, requests)
           VALUES (?, ?, ?, ?, ?)`,
        )
          .bind(hs.date, hs.hour, hs.pv, hs.uv, hs.requests)
          .run();
      }
      if (hourlyStats.length > 0) {
        console.log(`[d1-cache] hourly backfill: ${date} → ${hourlyStats.length} hours`);
      }
    } catch (err) {
      // Date outside retention — skip silently
      console.log(`[d1-cache] hourly backfill skipped for ${date} (out of retention): ${err}`);
    }
  }
}

// ── D1 Read Helpers ──────────────────────────────────────────────

/**
 * Read cached daily page stats for a date range from D1.
 */
export async function readDailyRange(
  env: CacheEnv,
  startDate: string,
  endDate: string,
): Promise<DailyRow[]> {
  const rows: any = await env.DB.prepare(
    "SELECT * FROM daily_page_stats WHERE date >= ? AND date <= ? ORDER BY date ASC",
  )
    .bind(startDate, endDate)
    .all();
  return (rows.results || []) as DailyRow[];
}

/**
 * Read today's cached hourly stats from D1.
 */
export async function readTodayHourly(
  env: CacheEnv,
  today: string,
): Promise<HourlyStats[]> {
  const rows: any = await env.DB.prepare(
    `SELECT hour, pv, uv, requests, uv_200, requests_200, geo_data, browser_data, os_data, device_data, page_data, page_paths, project_data
     FROM hourly_page_stats WHERE date = ? ORDER BY hour ASC`,
  )
    .bind(today)
    .all();
  return ((rows.results || []) as any[]).map((r: any) => ({
    date: today,
    hour: r.hour,
    pv: r.pv || 0,
    uv: r.uv || 0,
    requests: r.requests || 0,
    uv200: r.uv_200 ?? undefined,
    requests200: r.requests_200 ?? undefined,
    countryMap: safeJSON(r.geo_data, []).map((c: any) => ({
      clientCountryName: c.country || c.clientCountryName || "",
      requests: c.count || c.requests || 0,
    })),
    browserMap: safeJSON(r.browser_data, []).map((b: any) => ({
      uaBrowserFamily: b.browser || b.uaBrowserFamily || "",
      pageViews: b.pageViews || 0,
    })),
    osData: safeJSON(r.os_data, []),
    deviceData: safeJSON(r.device_data, []),
    pathData: safeJSON(r.page_data, []),
    pagePaths: safeJSON(r.page_paths, []),
    projectData: safeJSON(r.project_data, []),
  }));
}

/**
 * Get all-time PV/UV from D1 (sum of all cached daily rows).
 *
 * PV 口径未变：CF 的 `pageViews` 本来就只算 HTML 文档 + 200，历史值可直接累计。
 * UV 口径变了（2026-11-24）：改为「仅 200 响应码的独立访客」，只有新写的行有
 * `uv_200`（历史行为 NULL）。因此累计 UV 只能从 `first200` 那天算起 ——
 * 调用方应当把这个起始日期一并展示，否则数字会显得「凭空缩水」。
 */
export async function readAllTimeTotals(
  env: CacheEnv,
): Promise<{ pv: number; uv: number; uv200: number; first200: string | null; days200: number }> {
  const row: any = await env.DB.prepare(
    `SELECT COALESCE(SUM(total_pv), 0) as pv,
            COALESCE(SUM(total_uv), 0) as uv,
            COALESCE(SUM(uv_200), 0) as uv200,
            COUNT(uv_200) as days200,
            MIN(CASE WHEN uv_200 IS NOT NULL THEN date END) as first200
     FROM daily_page_stats`,
  ).first();
  return {
    pv: row?.pv || 0,
    uv: row?.uv || 0,
    uv200: row?.uv200 || 0,
    first200: row?.first200 || null,
    days200: row?.days200 || 0,
  };
}

/**
 * 当日（或指定日期）的**真实** PV/UV —— 直接取 CF `httpRequests1dGroups` 的
 * `sum.pageViews` 与 `uniq.uniques`，即当天整个窗口内的一次去重结果。
 *
 * 为什么不能用小时表相加：UV 是「窗内唯一访客」，24 个小时各自去重后相加会把
 * 同一个访客重复计 2~24 次。实测今日 Σ小时UV 比真实值高 46%。
 *
 * 缓存：`live_today_stats` 行，默认 5 分钟内复用，避免每次开面板都打 CF quota。
 * 日终固化：cron 回填 daily_page_stats 时用的是同口径（1dGroups），两边一致。
 */
export async function readLiveDayStats(
  env: CacheEnv,
  date: string,
  maxAgeSeconds = 300,
): Promise<{ pv: number; uv: number; requests: number; cached: boolean }> {
  const now = Math.floor(Date.now() / 1000);

  // 0. 建表（幂等）。cron 直接调本函数时不会经过 runMigration，
  //    少这一句就是「表不存在 → INSERT 静默失败 → 永远读不到真实值」。
  try {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS live_today_stats (
        date TEXT PRIMARY KEY,
        pv INTEGER DEFAULT 0,
        uv INTEGER DEFAULT 0,
        requests INTEGER DEFAULT 0,
        uv_200 INTEGER,
        requests_200 INTEGER,
        fetched_at INTEGER DEFAULT 0
      )`,
    ).run();
  } catch {
    // 已存在 / 并发创建 —— 忽略
  }

  // 1. 命中缓存
  // 旧表可能缺列 —— 幂等补齐（SQLite 的 ALTER 对已存在列抛错，忽略即可）
  for (const ddl of [
    "ALTER TABLE live_today_stats ADD COLUMN uv_200 INTEGER",
    "ALTER TABLE live_today_stats ADD COLUMN requests_200 INTEGER",
  ]) {
    try {
      await env.DB.prepare(ddl).run();
    } catch {
      // 列已存在
    }
  }

  const row: any = await env.DB.prepare(
    "SELECT pv, uv, requests, uv_200, requests_200, fetched_at FROM live_today_stats WHERE date = ?",
  )
    .bind(date)
    .first();
  if (row && now - (row.fetched_at || 0) < maxAgeSeconds) {
    return {
      pv: row.pv || 0,
      uv: row.uv_200 ?? row.uv ?? 0,
      requests: row.requests_200 ?? row.requests ?? 0,
      cached: true,
    };
  }

  // 2. 向 CF 取该日真实值（200 口径：uv/requests 走 adaptiveGroups 的 clientIP 分组）
  const fallback = row
    ? { pv: row.pv || 0, uv: row.uv_200 ?? row.uv ?? 0, requests: row.requests_200 ?? row.requests ?? 0 }
    : { pv: 0, uv: 0, requests: 0 };
  if (!hasConfig(env)) {
    return { ...fallback, cached: false };
  }
  try {
    const stats = await fetchDailyStats(getZoneId(env), getApiToken(env), [date], { status200: true });
    const d = stats[0];
    if (!d) {
      return { ...fallback, cached: false };
    }
    // UV / requests 一律取 200 口径；CF 未返回（查询失败）则回退旧值
    const uv200 = d.uv200 ?? d.uv ?? 0;
    const req200 = d.requests200 ?? d.requests ?? 0;
    await env.DB.prepare(
      `INSERT OR REPLACE INTO live_today_stats (date, pv, uv, requests, uv_200, requests_200, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(date, d.pv || 0, d.uv || 0, d.requests || 0, uv200, req200, now)
      .run();
    return { pv: d.pv || 0, uv: uv200, requests: req200, cached: false };
  } catch (err) {
    console.error("[d1-cache] readLiveDayStats failed:", err);
    return { ...fallback, cached: false };
  }
}
