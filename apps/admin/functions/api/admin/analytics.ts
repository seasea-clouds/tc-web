/**
 * Analytics API — pure D1 reader.
 * GET /api/admin/analytics?range=today|7d|30d&start_date=&end_date=
 *
 * Data flow:
 *   1. Run D1 schema migration (idempotent)
 *   2. Read all data from D1, build response
 *
 * Backfill (CF → D1) is handled by trade-web-admin-analytics-cron Worker
 * (@ 0 * * * * UTC). If data is temporarily stale during cron deployment
 * window, the API gracefully returns whatever D1 currently has.
 */

import { requireAdmin } from "../../lib/admin-session";
import {
  runMigration,
  readDailyRange,
  readTodayHourly,
  readAllTimeTotals,
  safeJSON,
} from "../../lib/d1-cache";
import { type HourlyStats } from "../../lib/cf-analytics";

interface Env {
  DB: any;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ZONE_ID?: string;
}

// ── Date helpers ─────────────────────────────────────────────────

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDateString(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Fill 24-hour slots from a map of {hour → {pv, uv}}. */
function fillHourly(
  hourMap: Map<number, { pv: number; uv: number }>,
): { hour: number; pv: number; uv: number }[] {
  const result: { hour: number; pv: number; uv: number }[] = [];
  for (let h = 0; h < 24; h++) {
    const slot = hourMap.get(h);
    result.push({ hour: h, pv: slot?.pv || 0, uv: slot?.uv || 0 });
  }
  return result;
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
        (map.get(key) as any)[countField] += item[countField];
      } else {
        map.set(key, { ...item });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b[countField] - a[countField]);
}

function emptyResponse() {
  return {
    allTimeTotal: 0,
    allTimeUV: 0,
    summary: { total: 0, uv: 0, today: 0, todayUV: 0, countries: 0 },
    hourlySum: [],
    hourlyAvg: [],
    hoursCovered: 0,
    dailyData: [],
    geoData: [],
    pageData: [],
    pagePaths: [],
    channelData: [],
    projectData: [],
    browserData: [],
    osData: [],
    deviceData: [],
  };
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
  const customStart = url.searchParams.get("start_date") || "";
  const customEnd = url.searchParams.get("end_date") || "";
  const today = todayUTC();

  // Determine date range
  let startDate: string;
  let endDate: string;
  let days: number;

  if (customStart && customEnd) {
    startDate = customStart;
    endDate = customEnd;
    days =
      Math.round(
        (new Date(customEnd + "T23:59:59Z").getTime() -
          new Date(customStart + "T00:00:00Z").getTime()) /
          86400000,
      ) + 1;
  } else if (range === "7d") {
    startDate = getDateString(Date.now() - 7 * 24 * 60 * 60 * 1000);
    endDate = today;
    days = 7;
  } else if (range === "30d") {
    startDate = getDateString(Date.now() - 30 * 24 * 60 * 60 * 1000);
    endDate = today;
    days = 30;
  } else {
    startDate = today;
    endDate = today;
    days = 1;
  }

  try {
    // 1. Schema migration (idempotent)
    await runMigration(context.env);

    // 2. Read all-time totals from D1
    //    Backfill is handled by trade-web-admin-analytics-cron (hourly cron Worker)
    const allTime = await readAllTimeTotals(context.env);

    // 3. Read today's hourly data
    const hourlyRows = await readTodayHourly(context.env, today);

    // Build hourly map
    const hourlyMap = new Map<number, { pv: number; uv: number }>();
    let todayPV = 0;
    let todayUV = 0;
    for (const h of hourlyRows) {
      hourlyMap.set(h.hour, { pv: h.pv || 0, uv: h.uv || 0 });
      todayPV += h.pv || 0;
      todayUV += h.uv || 0;
    }
    const hourlySum = fillHourly(hourlyMap);

    // ─── RANGE: today ───
    if (range === "today") {
      // For geo/browser/page data, use the most recent daily row as a best estimate
      // (today's adaptive groups data is incomplete/sampled)
      const dailyRows = await readDailyRange(context.env, "2026-06-01", today);
      const latestComplete = dailyRows[dailyRows.length - 1];

      let geoData: { country: string; count: number }[] = [];
      let pageData: { path: string; count: number }[] = [];
      let pagePaths: { path: string; count: number }[] = [];
      let projectData: { project: string; count: number }[] = [];
      let browserData: { browser: string; pageViews: number }[] = [];
      let osData: { os: string; count: number }[] = [];
      let deviceData: { device: string; count: number }[] = [];

      if (latestComplete) {
        geoData = safeJSON(latestComplete.geo_data, []);
        pageData = safeJSON(latestComplete.page_data, []);
        pagePaths = safeJSON(latestComplete.page_paths, []);
        projectData = safeJSON(latestComplete.project_data, []);
        browserData = safeJSON(latestComplete.browser_data, []);
        osData = safeJSON(latestComplete.os_data, []);
        deviceData = safeJSON(latestComplete.device_data, []);
      }

      return Response.json({
        allTimeTotal: allTime.pv,
        allTimeUV: allTime.uv,
        summary: {
          total: todayPV,
          uv: todayUV,
          today: todayPV,
          todayUV: todayUV,
          countries: geoData.length,
        },
        hourlySum,
        hourlyAvg: hourlySum,
        hoursCovered: 1,
        dailyData:
          hourlyRows.length > 0
            ? [{ date: today, pv: todayPV, uv: todayUV }]
            : [],
        geoData,
        pageData,
        pagePaths,
        channelData: [],
        projectData,
        browserData,
        osData,
        deviceData,
      });
    }

    // ─── RANGE: 7d / 30d / custom ───
    // Read daily rows for the period
    const dailyRows = await readDailyRange(context.env, startDate, endDate);

    let periodPV = 0;
    let periodUV = 0;
    const dailyData: { date: string; pv: number; uv: number }[] = [];

    // Collect per-dimension arrays for merging
    const geoArrays: { country: string; count: number }[][] = [];
    const pageArrays: { path: string; count: number }[][] = [];
    const pagePathsArrays: { path: string; count: number }[][] = [];
    const projectArrays: { project: string; count: number }[][] = [];
    const browserArrays: { browser: string; pageViews: number }[][] = [];
    const osArrays: { os: string; count: number }[][] = [];
    const deviceArrays: { device: string; count: number }[][] = [];
    const hourlyMaps: Map<number, { pv: number; uv: number }>[] = [];

    for (const row of dailyRows) {
      periodPV += row.total_pv || 0;
      periodUV += row.total_uv || 0;
      dailyData.push({
        date: row.date,
        pv: row.total_pv || 0,
        uv: row.total_uv || 0,
      });

      if (row.geo_data) geoArrays.push(safeJSON(row.geo_data, []));
      if (row.page_data) pageArrays.push(safeJSON(row.page_data, []));
      if (row.page_paths) pagePathsArrays.push(safeJSON(row.page_paths, []));
      if (row.project_data) projectArrays.push(safeJSON(row.project_data, []));
      if (row.browser_data) browserArrays.push(safeJSON(row.browser_data, []));
      if (row.os_data) osArrays.push(safeJSON(row.os_data, []));
      if (row.device_data) deviceArrays.push(safeJSON(row.device_data, []));
    }

    // Add today's hourly data (today is not in daily_page_stats until tomorrow)
    if (hourlyRows.length > 0) {
      hourlyMaps.push(hourlyMap);
      periodPV += todayPV;
      periodUV += todayUV;
      dailyData.push({ date: today, pv: todayPV, uv: todayUV });
    }

    // Merge hourly maps from all dates
    const mergedHourlyMap = new Map<number, { pv: number; uv: number }>();
    for (const m of hourlyMaps) {
      Array.from(m.entries()).forEach(([hour, val]) => {
        const existing = mergedHourlyMap.get(hour) || { pv: 0, uv: 0 };
        mergedHourlyMap.set(hour, {
          pv: existing.pv + val.pv,
          uv: existing.uv + val.uv,
        });
      });
    }

    const periodHourly = fillHourly(mergedHourlyMap);
    const hourlyAvg = periodHourly.map((h) => ({
      hour: h.hour,
      pv: Math.round(h.pv / days),
      uv: Math.round(h.uv / days),
    }));

    // Merge distribution data
    const geoData = mergeByKey(geoArrays, "country", "count");
    const pageData = mergeByKey(pageArrays, "path", "count");
    const pagePaths = mergeByKey(pagePathsArrays, "path", "count");

    return Response.json({
      allTimeTotal: allTime.pv,
      allTimeUV: allTime.uv,
      summary: {
        total: periodPV,
        uv: periodUV,
        today: todayPV,
        todayUV: todayUV,
        countries: geoData.length,
      },
      hourlySum: periodHourly,
      hourlyAvg,
      hoursCovered: days,
      dailyData,
      geoData: geoData.slice(0, 20),
      pageData: pageData.slice(0, 30),
      pagePaths: pagePaths.slice(0, 30),
      channelData: [],
      projectData: mergeByKey(projectArrays, "project", "count"),
      browserData: mergeByKey(browserArrays, "browser", "pageViews"),
      osData: mergeByKey(osArrays, "os", "count"),
      deviceData: mergeByKey(deviceArrays, "device", "count"),
    });
  } catch (err: any) {
    console.error("[analytics] error:", err);
    return Response.json(emptyResponse());
  }
}
