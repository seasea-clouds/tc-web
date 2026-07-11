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
  inferProject,
  type HourlyStats,
} from "./cf-analytics";

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
 * 2. 排除静态资源文件（带已知后缀的）
 * 3. 排除 Next.js 内部路径（_next、__nextjs）
 * 4. 排除常见的静态资源目录（fonts、images）
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

  // 第 3 步：排除已知的静态资源文件扩展名和扫描器文件
  if (
    /\.(js|css|png|jpe?g|gif|svg|ico|webp|avif|ttf|woff2?|eot|otf|json|xml|map|txt|php|phar|phtml|asp|aspx|jsp|log|bak|sql|env|conf|ini|yml|yaml|md)(\?|$)/i.test(
      clean,
    )
  ) {
    return false;
  }

  // 第 4 步：排除已知的静态资源目录（这些目录下不可能有页面）
  if (
    clean.startsWith("/fonts/") ||
    clean.startsWith("/images/") ||
    clean.startsWith("/assets/") ||
    clean === "/favicon.ico"
  ) {
    return false;
  }

  // 第 5 步：排除隐藏文件和已知扫描器/攻击路径
  if (
    clean.startsWith("/.") || // 隐藏文件 /.env, /.ssmtp.conf 等
    clean.startsWith("/wp-") || // WordPress 扫描
    clean.startsWith("/php") || // PHP 探针/信息扫描
    clean.startsWith("/xmlrpc") || // XML-RPC 扫描
    clean.startsWith("//") || // 双斜杠路径（扫描器常见特征）
    clean === "/crossdomain.xml" ||
    clean === "/clientaccesspolicy.xml"
  ) {
    return false;
  }

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
    `CREATE TABLE IF NOT EXISTS hourly_page_stats (
      date TEXT NOT NULL,
      hour INTEGER NOT NULL,
      pv INTEGER DEFAULT 0,
      uv INTEGER DEFAULT 0,
      requests INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (date, hour)
    )`,
    // Safe ALTER TABLE for columns that might not exist
    `ALTER TABLE daily_page_stats ADD COLUMN page_data TEXT DEFAULT '[]'`,
    `ALTER TABLE daily_page_stats ADD COLUMN project_data TEXT DEFAULT '[]'`,
    `ALTER TABLE daily_page_stats ADD COLUMN page_paths TEXT DEFAULT '[]'`,
    `ALTER TABLE daily_page_stats ADD COLUMN device_data TEXT DEFAULT '[]'`,
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
    const dailyStats = await fetchDailyStats(zoneId, token, missingDates);

    for (const ds of dailyStats) {
      if (ds.pv === 0 && ds.requests === 0) {
        // No traffic — still insert a row so we don't re-query
        await env.DB.prepare(
          `INSERT OR REPLACE INTO daily_page_stats
           (date, total_pv, total_uv, total_requests, source)
           VALUES (?, 0, 0, 0, 'cf_api')`,
        )
          .bind(ds.date)
          .run();
        continue;
      }

      await env.DB.prepare(
        `INSERT OR REPLACE INTO daily_page_stats
         (date, total_pv, total_uv, total_requests, total_bytes, cached_requests,
          countries_count, geo_data, browser_data, status_code_data, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cf_api')`,
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
          // 从全部路径中过滤出仅页面路径（基于路由架构 isPage + 静态资源排除）
          const pagePaths = agg.pathData.filter((p) => isPagePath(p.path));

          await env.DB.prepare(
            `UPDATE daily_page_stats
             SET page_data = ?, page_paths = ?, os_data = ?, device_data = ?, project_data = ?
             WHERE date = ? AND source = 'cf_api'`,
          )
            .bind(
              JSON.stringify(agg.pathData),
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
 * Ensure today's completed UTC hours are cached in D1.
 * Only fetches hours that are in the past (completed) and not yet cached.
 */
export async function ensureHourlyCFCache(env: CacheEnv): Promise<void> {
  if (!hasConfig(env)) return;

  const zoneId = getZoneId(env);
  const token = getApiToken(env);
  const now = new Date();
  const today = todayUTC();
  const currentHour = now.getUTCHours();

  // No completed hours yet today
  if (currentHour < 1) return;

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
  if (missingHours.length === 0) return;

  const startHour = Math.min(...missingHours);
  const endHour = Math.max(...missingHours) + 1;
  const startISO = formatISO(today, startHour);
  const endISO = formatISO(today, endHour);

  try {
    const hourlyStats = await fetchHourlyStats(zoneId, token, startISO, endISO);
    for (const hs of hourlyStats) {
      await env.DB.prepare(
        `INSERT OR REPLACE INTO hourly_page_stats (date, hour, pv, uv, requests)
         VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(today, hs.hour, hs.pv, hs.uv, hs.requests)
        .run();
    }
  } catch (err) {
    console.error(`[d1-cache] fetchHourlyStats failed for ${today}:`, err);
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
    "SELECT hour, pv, uv, requests FROM hourly_page_stats WHERE date = ? ORDER BY hour ASC",
  )
    .bind(today)
    .all();
  return (rows.results || []) as HourlyStats[];
}

/**
 * Get all-time PV/UV from D1 (sum of all cached daily rows).
 */
export async function readAllTimeTotals(env: CacheEnv): Promise<{ pv: number; uv: number }> {
  const row: any = await env.DB.prepare(
    "SELECT COALESCE(SUM(total_pv), 0) as pv, COALESCE(SUM(total_uv), 0) as uv FROM daily_page_stats",
  ).first();
  return { pv: row?.pv || 0, uv: row?.uv || 0 };
}
