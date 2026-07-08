/**
 * Analytics API — now powered by Cloudflare GraphQL Analytics.
 * GET /api/admin/analytics?range=today|7d|30d
 *
 * Data flow:
 *   1. Auto-migrates D1 schema (adds columns, hourly_page_stats table)
 *   2. Fetches missing daily/historical stats from CF (lazy backfill)
 *   3. Fetches missing hourly stats from CF (for current day)
 *   4. Builds response from D1 cached tables
 */

import { requireAdmin } from "../../lib/admin-session";
import {
  hasConfig,
  getApiToken,
  getZoneId,
  fetchDailyStats,
  fetchHourlyStats,
  fetchAggregateStats,
  fetchAggregateStatsRange,
  type DailyStats,
  type HourlyStats,
  type AggregateStats,
} from "../../lib/cf-analytics";

interface Env {
  DB: any;
}

// ── D1 Schema Migration ──────────────────────────────────────────

async function runMigration(env: Env): Promise<void> {
  const statements = [
    // Add new columns to daily_page_stats (ALTER TABLE is safe if column exists)
    `ALTER TABLE daily_page_stats ADD COLUMN total_requests INTEGER DEFAULT 0`,
    `ALTER TABLE daily_page_stats ADD COLUMN total_bytes INTEGER DEFAULT 0`,
    `ALTER TABLE daily_page_stats ADD COLUMN cached_requests INTEGER DEFAULT 0`,
    `ALTER TABLE daily_page_stats ADD COLUMN browser_data TEXT DEFAULT '[]'`,
    `ALTER TABLE daily_page_stats ADD COLUMN status_code_data TEXT DEFAULT '[]'`,
    `ALTER TABLE daily_page_stats ADD COLUMN os_data TEXT DEFAULT '[]'`,
    `ALTER TABLE daily_page_stats ADD COLUMN device_data TEXT DEFAULT '[]'`,
    `ALTER TABLE daily_page_stats ADD COLUMN source TEXT DEFAULT 'page_views'`,
    // Create hourly aggregation table
    `CREATE TABLE IF NOT EXISTS hourly_page_stats (
      date TEXT NOT NULL, hour INTEGER NOT NULL, pv INTEGER DEFAULT 0,
      uv INTEGER DEFAULT 0, requests INTEGER DEFAULT 0,
      PRIMARY KEY (date, hour)
    )`,
  ];
  for (const sql of statements) {
    try {
      await env.DB.prepare(sql).run();
    } catch {
      // Column already exists — safe to ignore
    }
  }
}

// ── Date helpers ─────────────────────────────────────────────────

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

function getDateString(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Build the 24-slot hourly array, filling gaps with 0. */
function fillHourly(hourMap: Map<number, { pv: number; uv: number }>): { hour: number; pv: number; uv: number }[] {
  const result: { hour: number; pv: number; uv: number }[] = [];
  for (let h = 0; h < 24; h++) {
    const slot = hourMap.get(h);
    result.push({ hour: h, pv: slot?.pv || 0, uv: slot?.uv || 0 });
  }
  return result;
}

// ── CF Data Fetching (side-effect: fill D1 cache) ────────────────

/**
 * Ensure CF daily stats are cached in D1 for all dates from last check to yesterday.
 * Also fetches aggregate stats (paths, OS, device, project) for each date.
 */
async function ensureDailyCFCache(env: Env, forceRefresh = false): Promise<string> {
  if (!hasConfig(env)) return "";

  const zoneId = getZoneId(env);
  const token = getApiToken(env);
  const today = todayUTC();
  const yesterday = yesterdayUTC();

  // On force refresh, delete all existing cf_api data and re-fetch from scratch
  if (forceRefresh) {
    await env.DB.prepare("DELETE FROM daily_page_stats WHERE source = 'cf_api'").run();
  }

  // Find the last date that was fetched via CF
  const lastRow: any = await env.DB.prepare(
    "SELECT MAX(date) as lastDate FROM daily_page_stats WHERE source = 'cf_api'",
  ).first();
  const lastFetched = lastRow?.lastDate || (forceRefresh ? "2026-06-01" : "2026-06-01");

  // If today == lastFetched, no new daily data yet
  if (!forceRefresh && lastFetched >= yesterday) return;

  const missingDates = dateRange(lastFetched, yesterday);
  // Remove lastFetched itself (already have it)
  if (missingDates[0] === lastFetched) missingDates.shift();
  if (missingDates.length === 0) return;

  // Batch fetch daily stats
  const dailyStats = await fetchDailyStats(zoneId, token, missingDates);

  for (const ds of dailyStats) {
    if (ds.pv === 0 && ds.requests === 0) {
      // No traffic that day — still insert a row so we don't re-fetch
      await env.DB.prepare(
        `INSERT OR REPLACE INTO daily_page_stats
         (date, total_pv, total_uv, total_requests, total_bytes, cached_requests,
          countries_count, source)
         VALUES (?, 0, 0, 0, 0, 0, 0, 'cf_api')`,
      )
        .bind(ds.date)
        .run();
      continue;
    }

    // Save daily stats
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
          ds.countryMap.map((c) => ({ country: c.clientCountryName, count: c.requests })),
        ),
        JSON.stringify(
          ds.browserMap.map((b) => ({ browser: b.uaBrowserFamily, pageViews: b.pageViews })),
        ),
        JSON.stringify(
          ds.statusCodeMap.map((s) => ({
            status: String(s.edgeResponseStatus),
            count: s.requests,
          })),
        ),
      )
      .run();
  }

  // Single range-based aggregate stats fetch (paths, OS, device, project)
  // Much more efficient than 1 per-date call
  if (dailyStats.length > 0) {
    const firstDate = dailyStats[0].date;
    const lastDate = dailyStats[dailyStats.length - 1].date;
    try {
      const aggMap = await fetchAggregateStatsRange(
        zoneId, token, firstDate, lastDate
      );
      for (const [date, agg] of Array.from(aggMap.entries())) {
        try {
          await env.DB.prepare(
            `UPDATE daily_page_stats
             SET page_data = ?, os_data = ?, device_data = ?, project_data = ?
             WHERE date = ? AND source = 'cf_api'`,
          )
            .bind(
              JSON.stringify(agg.pathData),
              JSON.stringify(agg.osData),
              JSON.stringify(agg.deviceData),
              JSON.stringify(agg.projectData),
              date,
            )
            .run();
        } catch (innerErr) {
          console.error(`[analytics] agg update failed for ${date}:`, innerErr);
        }
      }
    } catch (err: any) {
      console.error(`[analytics] fetchAggregateStatsRange failed:`, err);
      return err.message || String(err);
    }
  }
  return "";
}

/**
 * Ensure today's hourly CF data is cached in D1.
 * Fetches any completed hours (before current UTC hour) that are missing.
 */
async function ensureHourlyCFCache(env: Env, forceRefresh = false): Promise<void> {
  if (!hasConfig(env)) return;

  const zoneId = getZoneId(env);
  const token = getApiToken(env);

  // Use CST (UTC+8) for today's hourly data
  const now = new Date();
  const cstNow = new Date(now.getTime() + 8 * 3600 * 1000);
  const cstDate = cstNow.toISOString().slice(0, 10);
  const cstHour = cstNow.getUTCHours();

  if (cstHour < 1) return;

  if (forceRefresh) {
    await env.DB.prepare("DELETE FROM hourly_page_stats WHERE date = ?").bind(cstDate).run();
  }

  const existing: any = await env.DB.prepare(
    "SELECT DISTINCT hour FROM hourly_page_stats WHERE date = ?",
  ).bind(cstDate).all();
  const existingHours = new Set<number>((existing.results || []).map((r: any) => r.hour));

  const missingHours: number[] = [];
  for (let h = 0; h < cstHour; h++) {
    if (!existingHours.has(h)) missingHours.push(h);
  }
  if (missingHours.length === 0) return;

  // Convert missing CST hours to UTC date+hour for CF GraphQL queries
  // CST h=0 = UTC (h+16)%24=16 of previous UTC day
  // CST h=8 = UTC (h-8)=0 of same UTC day
  const cstMidnightUTC = new Date(cstDate + "T00:00:00Z").getTime() - 8 * 3600 * 1000;
  const prevUTC = new Date(cstMidnightUTC).toISOString().slice(0, 10);

  const byUtcDate: Record<string, number[]> = {};
  for (const h of missingHours) {
    const utcHour = (h + 16) % 24;
    const utcDate = h < 8 ? prevUTC : cstDate;
    if (!byUtcDate[utcDate]) byUtcDate[utcDate] = [];
    byUtcDate[utcDate].push(utcHour);
  }

  for (const [utcDate, utcHours] of Object.entries(byUtcDate)) {
    const startHour = Math.min(...utcHours);
    const endHour = Math.min(Math.max(...utcHours) + 1, 24);
    const startISO = formatISO(utcDate, startHour);
    const endISO = formatISO(utcDate, endHour);

    try {
      const hourlyStats = await fetchHourlyStats(zoneId, token, startISO, endISO);
      for (const hs of hourlyStats) {
        const cstH = (hs.hour + 8) % 24;
        await env.DB.prepare(
          `INSERT OR REPLACE INTO hourly_page_stats (date, hour, pv, uv, requests)
           VALUES (?, ?, ?, ?, ?)`,
        ).bind(cstDate, cstH, hs.pv, hs.uv, hs.requests).run();
      }
    } catch (err) {
      console.error(`[analytics] fetchHourlyStats failed for ${utcDate}:`, err);
    }
  }
}

// ── D1 Read Helpers ──────────────────────────────────────────────

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
  project_data: string;
}

async function readDailyRange(
  env: Env,
  startDate: string,
  endDate: string,
): Promise<DailyRow[]> {
  const rows: any = await env.DB.prepare(
    `SELECT * FROM daily_page_stats WHERE date >= ? AND date <= ? ORDER BY date ASC`,
  )
    .bind(startDate, endDate)
    .all();
  return (rows.results || []) as DailyRow[];
}

async function readTodayHourly(env: Env, today: string): Promise<HourlyStats[]> {
  const rows: any = await env.DB.prepare(
    "SELECT * FROM hourly_page_stats WHERE date = ? ORDER BY hour ASC",
  )
    .bind(today)
    .all();
  return (rows.results || []) as HourlyStats[];
}

/** Merge arrays of {keyField→string, countField→number} by summing counts. Returns sorted desc. */
function mergeByKey<T extends Record<string, any>>(
  arrays: T[][],
  keyField: string,
  countField: string,
): T[] {
  const map = new Map<string, T>();
  for (const arr of arrays) {
    for (const item of arr) {
      const key = item[keyField];
      if (key === undefined || key === null || key === "") continue;
      if (map.has(key)) {
        map.set(key, {
          ...map.get(key)!,
          [countField]: map.get(key)![countField] + item[countField],
        });
      } else {
        map.set(key, { ...item });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b[countField] - a[countField]);
}

function safeJSON<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// ── Main Handler ────────────────────────────────────────────────

export async function onRequest(context: { request: Request; env: Env }) {
  try {
    await requireAdmin(context.request, context.env);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(context.request.url);
  const range = url.searchParams.get("range") || "today";
  const forceRefresh = url.searchParams.get("trigger") === "1";
  const customStart = url.searchParams.get("start_date") || "";
  const customEnd = url.searchParams.get("end_date") || "";

  // Determine date range
  let days: number;
  let pastStart: string;
  const today = todayUTC();
  const cstToday = new Date(new Date().getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);

  if (customStart && customEnd) {
    // Custom date range
    days = Math.round((new Date(customEnd + "T23:59:59Z").getTime() - new Date(customStart + "T00:00:00Z").getTime()) / (86400000)) + 1;
    pastStart = customStart;
  } else if (range === "7d") {
    days = 7;
    pastStart = getDateString(Date.now() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === "30d") {
    days = 30;
    pastStart = getDateString(Date.now() - 30 * 24 * 60 * 60 * 1000);
  } else {
    days = 1;
    pastStart = today;
  }

  try {
    // 0. Query all-time totals from D1
    const allTimeRow: any = await context.env.DB.prepare(
      "SELECT COALESCE(SUM(total_pv), 0) as pv, COALESCE(SUM(total_uv), 0) as uv FROM daily_page_stats"
    ).first();
    const allTimePV = allTimeRow?.pv || 0;
    const allTimeUV = allTimeRow?.uv || 0;

    // 1. Run D1 schema migration (idempotent)
    await runMigration(context.env);

    // 2. Fetch missing data from CF (non-blocking — errors won't break the response)
    let aggError = "";
    try {
      aggError = await ensureDailyCFCache(context.env, forceRefresh);
    } catch (e) {
      console.error('[analytics] ensureDailyCFCache error:', e);
    }
    try {
      await ensureHourlyCFCache(context.env, forceRefresh);
    } catch (e) {
      console.error('[analytics] ensureHourlyCFCache error:', e);
    }

    if (range === "today") {
      // ===== TODAY ONLY =====
      const hourlyRows = await readTodayHourly(context.env, cstToday);

      // Build hourly map
      const hourlyMap = new Map<number, { pv: number; uv: number }>();
      for (const h of hourlyRows) {
        hourlyMap.set(h.hour, { pv: h.pv || 0, uv: h.uv || 0 });
      }

      const hourlySum = fillHourly(hourlyMap);
      const totalPV = hourlyRows.reduce((s, h) => s + (h.pv || 0), 0);
      const totalUV = hourlyRows.reduce((s, h) => s + (h.uv || 0), 0);

      // Get today's aggregate stats from the adaptive groups (stored in the latest daily row)
      // For today, we only have hourly data. Path/geo data comes from historical daily rows.
      // Read the most recent daily row for distributions
      const dailyRows = await readDailyRange(context.env, pastStart, today);
      let latestDaily = dailyRows[dailyRows.length - 1];

      // If no data for today, fall back to the most recent available row (yesterday)
      if (!latestDaily) {
        const allDaily = await readDailyRange(context.env, "2026-06-01", yesterdayUTC());
        latestDaily = allDaily[allDaily.length - 1];
      }

      // For geo, use the most recent daily page stat's geo_data
      let geoData: { country: string; count: number }[] = [];
      let pageData: { path: string; count: number }[] = [];
      let projectData: { project: string; count: number }[] = [];

      let browserData: any[] = [];
      let osData: any[] = [];
      let deviceData: any[] = [];

      if (latestDaily) {
        geoData = safeJSON(latestDaily.geo_data, []);
        pageData = safeJSON(latestDaily.page_data, []);
        projectData = safeJSON(latestDaily.project_data, []);
        browserData = safeJSON(latestDaily.browser_data, []);
        osData = safeJSON(latestDaily.os_data, []);
        deviceData = safeJSON(latestDaily.device_data, []);
      }

      return Response.json({
        allTimeTotal: allTimePV,
        allTimeUV: allTimeUV,
        summary: {
          total: totalPV,
          uv: totalUV,
          today: totalPV,
          todayUV: totalUV,
          countries: geoData.length,
        },
        hourlySum,
        hourlyAvg: hourlySum,
        hoursCovered: 1,
        dailyData: hourlyRows.length > 0
          ? [{ date: today, pv: totalPV, uv: totalUV }]
          : [],
        geoData,
        pageData,
        channelData: [],
        projectData,
        browserData,
        osData,
        deviceData,
      });
    }

    // ===== MULTI-DAY (7d/30d) =====
    const dailyRows = await readDailyRange(context.env, pastStart, today);
    const hourlyRows = await readTodayHourly(context.env, cstToday);

    // Aggregate daily totals
    let totalPV = 0;
    let totalUV = 0;
    const dailyData: { date: string; pv: number; uv: number }[] = [];

    // Collect arrays for merging
    const geoArrays: { country: string; count: number }[][] = [];
    const pageArrays: { path: string; count: number }[][] = [];
    const projectArrays: { project: string; count: number }[][] = [];
    const browserArrays: { browser: string; pageViews: number }[][] = [];
    const osArrays: { os: string; count: number }[][] = [];
    const deviceArrays: { device: string; count: number }[][] = [];
    const hourlyMaps: Map<number, { pv: number; uv: number }>[] = [];

    for (const row of dailyRows) {
      totalPV += row.total_pv || 0;
      totalUV += row.total_uv || 0;
      dailyData.push({ date: row.date, pv: row.total_pv || 0, uv: row.total_uv || 0 });

      // Distributions
      if (row.geo_data) geoArrays.push(safeJSON(row.geo_data, []));
      if (row.page_data) pageArrays.push(safeJSON(row.page_data, []));
      if (row.project_data) projectArrays.push(safeJSON(row.project_data, []));
      if (row.browser_data) browserArrays.push(safeJSON(row.browser_data, []));
      if (row.os_data) osArrays.push(safeJSON(row.os_data, []));
      if (row.device_data) deviceArrays.push(safeJSON(row.device_data, []));
    }

    // Add today's hourly data
    const todayHourMap = new Map<number, { pv: number; uv: number }>();
    for (const h of hourlyRows) {
      todayHourMap.set(h.hour, { pv: h.pv || 0, uv: h.uv || 0 });
    }
    if (hourlyRows.length > 0) {
      hourlyMaps.push(todayHourMap);
      const todayPV = hourlyRows.reduce((s, h) => s + (h.pv || 0), 0);
      const todayUV = hourlyRows.reduce((s, h) => s + (h.uv || 0), 0);
      totalPV += todayPV;
      totalUV += todayUV;
      dailyData.push({ date: today, pv: todayPV, uv: todayUV });
    }

    // Merge hourly
    const mergedHourlyMap = new Map<number, { pv: number; uv: number }>();
    for (const m of hourlyMaps) {
      for (const [hour, val] of m) {
        const existing = mergedHourlyMap.get(hour) || { pv: 0, uv: 0 };
        mergedHourlyMap.set(hour, { pv: existing.pv + val.pv, uv: existing.uv + val.uv });
      }
    }

    // Add per-day hourly from daily_page_stats (if stored)
    // Currently we don't store hourly breakdown in daily_page_stats for CF data
    // because we have separate hourly_page_stats table. But for 7d/30d ranges,
    // we only have daily aggregates, not hourly. Provide what we have.

    const hourlySum = fillHourly(mergedHourlyMap);
    const hourlyAvg = hourlySum.map((h) => ({
      hour: h.hour,
      pv: Math.round(h.pv / days),
      uv: Math.round(h.uv / days),
    }));

    // Merge distributions
    const geoData = mergeByKey(geoArrays, "country", "count");
    const pageData = mergeByKey(pageArrays, "path", "count");
    const projectData = mergeByKey(projectArrays, "project", "count");

    return Response.json({
      allTimeTotal: allTimePV,
      allTimeUV: allTimeUV,
      aggError: aggError,      summary: {
        total: totalPV,
        uv: totalUV,
        today: hourlyRows.reduce((s, h) => s + (h.pv || 0), 0),
        todayUV: hourlyRows.reduce((s, h) => s + (h.uv || 0), 0),
        countries: geoData.length,
      },
      hourlySum,
      hourlyAvg,
      hoursCovered: days,
      dailyData,
      geoData: geoData.slice(0, 20),
      pageData: pageData.slice(0, 30),
      channelData: [],
      projectData,
      browserData: mergeByKey(browserArrays, "browser", "pageViews"),
      osData: mergeByKey(osArrays, "os", "count"),
      deviceData: mergeByKey(deviceArrays, "device", "count"),
    });
  } catch (err: any) {
    console.error("[analytics] error:", err);
    return Response.json({
      allTimeTotal: 0,
      allTimeUV: 0,
      summary: { total: 0, uv: 0, today: 0, todayUV: 0, countries: 0 },
      hourlySum: [],
      hourlyAvg: [],
      hoursCovered: 0,
      dailyData: [],
      geoData: [],
      pageData: [],
      channelData: [],
      projectData: [],
      browserData: [],
      osData: [],
      deviceData: [],
    });
  }
}
