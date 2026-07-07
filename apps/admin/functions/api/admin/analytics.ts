/**
 * Analytics API — custom D1-based page view analytics
 * GET /api/admin/analytics?range=today|7d|30d
 * GET /api/admin/analytics?trigger=1 — manual aggregation trigger
 *
 * Data sources:
 *   - Today (current UTC day):  queries `page_views` directly (real-time detail)
 *   - History (yesterday → past): reads from `daily_page_stats` (pre-aggregated JSON)
 *
 * Lazy aggregation: before querying, any unaggregated previous-day `page_views`
 * rows are consolidated into `daily_page_stats` and then deleted.
 */

import { requireAdmin } from "../../lib/admin-session";
import { maybeAggregate } from "../../lib/aggregate";

interface Env {
  DB: any;
}

// ── Helpers ──────────────────────────────────────────────────────

/** Current UTC date string YYYY-MM-DD */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
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

/**
 * Merge arrays of {keyField → string, countField → number} by summing counts.
 * Returns sorted descending by countField.
 */
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

// ── Historical data helper (reads daily_page_stats) ────────────

interface HistoricalResult {
  totalPV: number;
  totalUV: number;
  countryCount: number;
  dailyRows: { date: string; pv: number; uv: number }[];
  hourlyData: { hour: number; pv: number; uv: number }[];
  geoData: { country: string; count: number }[];
  pageData: { path: string; count: number }[];
  channelData: { channel: string; count: number }[];
  projectData: { project: string; count: number }[];
}

async function getHistorical(env: Env, startDate: string, endDate: string): Promise<HistoricalResult> {
  const empty: HistoricalResult = {
    totalPV: 0,
    totalUV: 0,
    countryCount: 0,
    dailyRows: [],
    hourlyData: new Array(24).fill(null).map((_, i) => ({ hour: i, pv: 0, uv: 0 })),
    geoData: [],
    pageData: [],
    channelData: [],
    projectData: [],
  };

  const rows: any = await env.DB.prepare(
    `SELECT * FROM daily_page_stats WHERE date >= ? AND date < ? ORDER BY date ASC`,
  )
    .bind(startDate, endDate)
    .all();

  if (!rows.results || rows.results.length === 0) return empty;

  let totalPV = 0;
  let totalUV = 0;
  let countryCount = 0;
  const dailyRows: { date: string; pv: number; uv: number }[] = [];
  const hourlyMaps: Map<number, { pv: number; uv: number }>[] = [];
  const geoArrays: { country: string; count: number }[][] = [];
  const pageArrays: { path: string; count: number }[][] = [];
  const channelArrays: { channel: string; count: number }[][] = [];
  const projectArrays: { project: string; count: number }[][] = [];

  for (const row of rows.results) {
    totalPV += row.total_pv || 0;
    totalUV += row.total_uv || 0;
    countryCount += row.countries_count || 0;
    dailyRows.push({ date: row.date, pv: row.total_pv || 0, uv: row.total_uv || 0 });

    // Hourly
    try {
      const hourly: { hour: number; pv: number; uv: number }[] = JSON.parse(row.hourly_data || "[]");
      const m = new Map<number, { pv: number; uv: number }>();
      for (const h of hourly) m.set(h.hour, { pv: h.pv, uv: h.uv });
      hourlyMaps.push(m);
    } catch {
      hourlyMaps.push(new Map());
    }

    // Distributions (stored as JSON arrays)
    try { geoArrays.push(JSON.parse(row.geo_data || "[]")); } catch { geoArrays.push([]); }
    try { pageArrays.push(JSON.parse(row.page_data || "[]")); } catch { pageArrays.push([]); }
    try { channelArrays.push(JSON.parse(row.channel_data || "[]")); } catch { channelArrays.push([]); }
    try { projectArrays.push(JSON.parse(row.project_data || "[]")); } catch { projectArrays.push([]); }
  }

  // Merge hourly: sum all hourly maps
  const mergedHourly = new Map<number, { pv: number; uv: number }>();
  for (const m of hourlyMaps) {
    for (const [hour, val] of m) {
      const existing = mergedHourly.get(hour) || { pv: 0, uv: 0 };
      mergedHourly.set(hour, { pv: existing.pv + val.pv, uv: existing.uv + val.uv });
    }
  }

  return {
    totalPV,
    totalUV,
    countryCount,
    dailyRows,
    hourlyData: fillHourly(mergedHourly),
    geoData: mergeByKey(geoArrays, "country", "count"),
    pageData: mergeByKey(pageArrays, "path", "count"),
    channelData: mergeByKey(channelArrays, "channel", "count"),
    projectData: mergeByKey(projectArrays, "project", "count"),
  };
}

// ── Today data helper (queries page_views directly) ────────────

async function getTodayData(env: Env, todayStart: string) {
  // Totals
  const [todayPV, todayUV, todayCountries]: any[] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) as pv FROM page_views WHERE created_at >= ?").bind(todayStart).first(),
    env.DB.prepare("SELECT COUNT(DISTINCT user_agent) as uv FROM page_views WHERE created_at >= ? AND user_agent != ''").bind(todayStart).first(),
    env.DB.prepare("SELECT COUNT(DISTINCT country) as count FROM page_views WHERE created_at >= ? AND country != '' AND country IS NOT NULL").bind(todayStart).first(),
  ]);

  // Hourly PV
  const hourlyRaw: any = await env.DB.prepare(
    `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour,
            COUNT(*) as pv
     FROM page_views
     WHERE created_at >= ?
     GROUP BY hour ORDER BY hour`,
  ).bind(todayStart).all();

  // Hourly UV
  const uvHourlyRaw: any = await env.DB.prepare(
    `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour,
            COUNT(DISTINCT user_agent) as uv
     FROM page_views
     WHERE created_at >= ? AND user_agent != ''
     GROUP BY hour ORDER BY hour`,
  ).bind(todayStart).all();

  const pvMap = new Map((hourlyRaw.results || []).map((r: any) => [r.hour, r.pv]));
  const uvMap = new Map((uvHourlyRaw.results || []).map((r: any) => [r.hour, r.uv]));
  const hourlyMap = new Map<number, { pv: number; uv: number }>();
  for (let h = 0; h < 24; h++) {
    hourlyMap.set(h, { pv: Number(pvMap.get(h) || 0), uv: Number(uvMap.get(h) || 0) });
  }

  // Distributions
  const [geoRaw, pagesRaw, channelsRaw, projectsRaw]: any[] = await Promise.all([
    env.DB.prepare(
      `SELECT country, COUNT(*) as count FROM page_views WHERE created_at >= ? AND country != '' AND country IS NOT NULL GROUP BY country ORDER BY count DESC LIMIT 20`,
    ).bind(todayStart).all(),
    env.DB.prepare(
      `SELECT path, COUNT(*) as count FROM page_views WHERE created_at >= ? GROUP BY path ORDER BY count DESC LIMIT 20`,
    ).bind(todayStart).all(),
    env.DB.prepare(
      `SELECT CASE WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
               WHEN referrer LIKE '%google.%' OR referrer LIKE '%bing.%' OR referrer LIKE '%baidu.%' OR referrer LIKE '%yandex.%' OR referrer LIKE '%duckduckgo.%' OR referrer LIKE '%sogou.%' OR referrer LIKE '%360.%' THEN 'Search'
               WHEN referrer LIKE '%facebook.%' OR referrer LIKE '%twitter.%' OR referrer LIKE '%x.com%' OR referrer LIKE '%linkedin.%' OR referrer LIKE '%instagram.%' OR referrer LIKE '%pinterest.%' OR referrer LIKE '%reddit.%' OR referrer LIKE '%weixin.%' OR referrer LIKE '%weibo.%' OR referrer LIKE '%youtube.%' THEN 'Social'
               WHEN referrer LIKE '%sinotradecompliance.%' OR referrer LIKE '%compli-service.%' OR referrer LIKE '%trade-web-%' THEN 'Internal'
               ELSE 'Referral' END AS channel,
               COUNT(*) as count
       FROM page_views WHERE created_at >= ? GROUP BY channel ORDER BY count DESC`,
    ).bind(todayStart).all(),
    env.DB.prepare(
      `SELECT project, COUNT(*) as count FROM page_views WHERE created_at >= ? GROUP BY project ORDER BY count DESC`,
    ).bind(todayStart).all(),
  ]);

  return {
    pv: todayPV?.pv || 0,
    uv: todayUV?.uv || 0,
    countries: todayCountries?.count || 0,
    hourlyMap,
    geoData: (geoRaw.results || []) as { country: string; count: number }[],
    pageData: (pagesRaw.results || []) as { path: string; count: number }[],
    channelData: (channelsRaw.results || []) as { channel: string; count: number }[],
    projectData: (projectsRaw.results || []) as { project: string; count: number }[],
  };
}

// ── Main handler ──────────────────────────────────────────────

export async function onRequest(context: { request: Request; env: Env }) {
  try {
    await requireAdmin(context.request, context.env);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(context.request.url);
  const range = url.searchParams.get("range") || "today";
  const isTrigger = url.searchParams.get("trigger") === "1";

  try {
    // ── Manual aggregation trigger ──
    if (isTrigger) {
      const aggregated = await maybeAggregate(context.env);
      return Response.json({
        ok: true,
        aggregated,
        message:
          aggregated.length > 0
            ? `已聚合 ${aggregated.length} 天数据: ${aggregated.join(", ")}`
            : "暂无需要聚合的数据，所有历史数据已完成聚合",
      });
    }

    // ── Lazy aggregation: consolidate any previous-day page_views ──
    await maybeAggregate(context.env);

    // ── Determine date range ──
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 1;
    const today = todayUTC();
    const todayStart = `${today} 00:00:00`;
    const pastStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    if (range === "today") {
      // ===== TODAY ONLY: from page_views =====
      const todayData = await getTodayData(context.env, todayStart);

      const hourlySum = fillHourly(todayData.hourlyMap);

      return Response.json({
        summary: {
          total: todayData.pv,
          uv: todayData.uv,
          today: todayData.pv,
          todayUV: todayData.uv,
          countries: todayData.countries,
        },
        hourlySum,
        hourlyAvg: hourlySum, // same for 1 day
        hoursCovered: 1,
        dailyData: [{ date: today, pv: todayData.pv, uv: todayData.uv }],
        geoData: todayData.geoData,
        pageData: todayData.pageData,
        channelData: todayData.channelData,
        projectData: todayData.projectData,
      });
    }

    // ===== MULTI-DAY: daily_page_stats + today's page_views =====
    const historical = await getHistorical(context.env, pastStart, today);
    const todayData = await getTodayData(context.env, todayStart);

    // ── Merge hourly ──
    const mergedHourlyMap = new Map(historical.hourlyData.map((h) => [h.hour, { pv: h.pv, uv: h.uv }]));
    for (const [hour, val] of todayData.hourlyMap) {
      const existing = mergedHourlyMap.get(hour) || { pv: 0, uv: 0 };
      mergedHourlyMap.set(hour, { pv: existing.pv + val.pv, uv: existing.uv + val.uv });
    }
    const hourlySum = fillHourly(mergedHourlyMap);
    const hourlyAvg = hourlySum.map((h) => ({
      hour: h.hour,
      pv: Math.round(h.pv / days),
      uv: Math.round(h.uv / days),
    }));

    // ── Merge distributions ──
    const geoData = mergeByKey([historical.geoData, todayData.geoData], "country", "count");
    const pageData = mergeByKey([historical.pageData, todayData.pageData], "path", "count");
    const channelData = mergeByKey([historical.channelData, todayData.channelData], "channel", "count");
    const projectData = mergeByKey([historical.projectData, todayData.projectData], "project", "count");

    // ── Daily data ──
    const dailyData = [
      ...historical.dailyRows,
      { date: today, pv: todayData.pv, uv: todayData.uv },
    ];

    return Response.json({
      summary: {
        total: historical.totalPV + todayData.pv,
        uv: Math.round((historical.totalUV + todayData.uv) / 1), // approximate (daily sums, not deduped cross-day)
        today: todayData.pv,
        todayUV: todayData.uv,
        countries: historical.countryCount + todayData.countries,
      },
      hourlySum,
      hourlyAvg,
      hoursCovered: days,
      dailyData,
      geoData: geoData.slice(0, 20),
      pageData: pageData.slice(0, 20),
      channelData,
      projectData,
    });
  } catch (err: any) {
    // Graceful fallback — admin dashboard handles empty data
    return Response.json({
      summary: { total: 0, uv: 0, today: 0, todayUV: 0, countries: 0 },
      hourlyData: [],
      hourlyAvg: [],
      hoursCovered: 0,
      dailyData: [],
      geoData: [],
      pageData: [],
      channelData: [],
      projectData: [],
    });
  }
}
