/**
 * Analytics API — powered by Cloudflare GraphQL Analytics.
 * GET /api/admin/analytics?range=today|7d|30d
 *
 * All data fetched directly from CF Analytics GraphQL API (no D1 cache).
 * The cf-analytics.ts library handles GraphQL queries, error handling,
 * and aggregate data merging across multiple dates.
 */

import { requireAdmin } from "../../lib/admin-session";
import {
  hasConfig,
  getApiToken,
  getZoneId,
  fetchDailyStats,
  fetchHourlyStats,
  fetchAggregateStatsRange,
} from "../../lib/cf-analytics";

interface Env {
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ZONE_ID?: string;
}

// ── Helpers ──────────────────────────────────────────────────────

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
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

  // Check if CF Analytics is configured
  if (!hasConfig(context.env)) {
    return Response.json(emptyResponse(), {
      headers: {
        "X-Analytics-Error":
          "CF Analytics not configured (missing CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN)",
      },
    });
  }

  const zoneId = getZoneId(context.env);
  const token = getApiToken(context.env);
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
    if (range === "today") {
      // ═════ TODAY ONLY: hourly + aggregate stats ═════

      // 1. Hourly PV/UV (for chart + summary)
      const hourlyStats = await fetchHourlyStats(
        zoneId,
        token,
        formatISO(today, 0),
        formatISO(today, 24),
      );

      const hourlyMap = new Map<number, { pv: number; uv: number }>();
      for (const h of hourlyStats) {
        hourlyMap.set(h.hour, { pv: h.pv || 0, uv: h.uv || 0 });
      }
      const hourlySum = fillHourly(hourlyMap);
      const totalPV = hourlyStats.reduce((s, h) => s + (h.pv || 0), 0);
      const totalUV = hourlyStats.reduce((s, h) => s + (h.uv || 0), 0);

      // 2. Daily aggregate (for country/browser data — not available via hourly)
      const dailyStats = await fetchDailyStats(zoneId, token, [today]);
      const ds = dailyStats[0];

      // 3. Aggregate stats (for paths, OS, device, project)
      const aggMap = await fetchAggregateStatsRange(zoneId, token, today, today);
      const agg = aggMap.get(today);

      return Response.json({
        allTimeTotal: totalPV,
        allTimeUV: totalUV,
        summary: {
          total: totalPV,
          uv: totalUV,
          today: totalPV,
          todayUV: totalUV,
          countries: ds?.countryMap?.length || 0,
        },
        hourlySum,
        hourlyAvg: hourlySum,
        hoursCovered: 1,
        dailyData:
          hourlyStats.length > 0
            ? [{ date: today, pv: totalPV, uv: totalUV }]
            : [],
        geoData:
          ds?.countryMap?.map((c) => ({
            country: c.clientCountryName,
            count: c.requests,
          })) || [],
        pageData: agg?.pathData || [],
        channelData: [],
        projectData: agg?.projectData || [],
        browserData:
          ds?.browserMap?.map((b) => ({
            browser: b.uaBrowserFamily,
            pageViews: b.pageViews,
          })) || [],
        osData: agg?.osData || [],
        deviceData: agg?.deviceData || [],
      });
    }

    // ═════ MULTI-DAY (7d/30d/custom) ═════

    // 1. Daily PV/UV + geo/browser per date
    const dateList = dateRange(startDate, endDate);
    const dailyStats = await fetchDailyStats(zoneId, token, dateList);

    let totalPV = 0;
    let totalUV = 0;
    const dailyData: { date: string; pv: number; uv: number }[] = [];
    const countryArrays: { country: string; count: number }[][] = [];
    const browserArrays: { browser: string; pageViews: number }[][] = [];

    for (const ds of dailyStats) {
      totalPV += ds.pv;
      totalUV += ds.uv;
      dailyData.push({ date: ds.date, pv: ds.pv, uv: ds.uv });
      if (ds.countryMap.length > 0) {
        countryArrays.push(
          ds.countryMap.map((c) => ({
            country: c.clientCountryName,
            count: c.requests,
          })),
        );
      }
      if (ds.browserMap.length > 0) {
        browserArrays.push(
          ds.browserMap.map((b) => ({
            browser: b.uaBrowserFamily,
            pageViews: b.pageViews,
          })),
        );
      }
    }

    // 2. Aggregate stats (paths, OS, device, project) across all dates
    const aggMap = await fetchAggregateStatsRange(zoneId, token, startDate, endDate);
    const pathArrays: { path: string; count: number }[][] = [];
    const osArrays: { os: string; count: number }[][] = [];
    const deviceArrays: { device: string; count: number }[][] = [];
    const projectArrays: { project: string; count: number }[][] = [];

    for (const [, agg] of aggMap) {
      if (agg.pathData.length > 0) pathArrays.push(agg.pathData);
      if (agg.osData.length > 0) osArrays.push(agg.osData);
      if (agg.deviceData.length > 0) deviceArrays.push(agg.deviceData);
      if (agg.projectData.length > 0) projectArrays.push(agg.projectData);
    }

    // 3. Today's hourly (for hourly chart when viewing 7d/30d)
    const hourlyStats = await fetchHourlyStats(
      zoneId,
      token,
      formatISO(today, 0),
      formatISO(today, 24),
    );
    const todayHourMap = new Map<number, { pv: number; uv: number }>();
    let todayPV = 0;
    let todayUV = 0;
    for (const h of hourlyStats) {
      todayHourMap.set(h.hour, { pv: h.pv || 0, uv: h.uv || 0 });
      todayPV += h.pv || 0;
      todayUV += h.uv || 0;
    }
    const hourlySum = fillHourly(todayHourMap);
    const hourlyAvg = hourlySum.map((h) => ({
      hour: h.hour,
      pv: Math.round(h.pv / days),
      uv: Math.round(h.uv / days),
    }));

    return Response.json({
      allTimeTotal: totalPV,
      allTimeUV: totalUV,
      summary: {
        total: totalPV,
        uv: totalUV,
        today: todayPV,
        todayUV: todayUV,
        countries:
          countryArrays.length > 0
            ? mergeByKey(countryArrays, "country", "count").length
            : 0,
      },
      hourlySum,
      hourlyAvg,
      hoursCovered: days,
      dailyData,
      geoData:
        mergeByKey(countryArrays, "country", "count").slice(0, 20),
      pageData:
        mergeByKey(pathArrays, "path", "count").slice(0, 30),
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
