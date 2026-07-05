/**
 * Analytics API — custom D1-based page view analytics
 * GET /api/admin/analytics?range=today|7d|30d
 *
 * Aggregates data from the page_views table to provide
 * PV/UV, geographic distribution, page breakdown, and time-series data.
 */

import { requireAdmin } from "../../lib/admin-session";

interface Env {
  DB: any;
}

export async function onRequest(context: { request: Request; env: Env }) {
  try {
    await requireAdmin(context.request, context.env);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(context.request.url);
  const range = url.searchParams.get("range") || "today";

  let days = range === "7d" ? 7 : range === "30d" ? 30 : 1;
  const pastStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const todayStart = new Date().toISOString().slice(0, 10) + "T00:00:00";

  try {
    // ── Overall counts ──
    const total: any = await context.env.DB.prepare(
      "SELECT COUNT(*) as pv, COUNT(DISTINCT country) as countries FROM page_views WHERE created_at >= ?",
    )
      .bind(pastStart)
      .first();

    const uniqueVisitors: any = await context.env.DB.prepare(
      "SELECT COUNT(DISTINCT user_agent) as uv FROM page_views WHERE created_at >= ? AND user_agent != ''",
    )
      .bind(pastStart)
      .first();

    // Today's stats
    const todayStats: any = await context.env.DB.prepare(
      "SELECT COUNT(*) as pv FROM page_views WHERE created_at >= ?",
    )
      .bind(todayStart)
      .first();

    const todayUV: any = await context.env.DB.prepare(
      "SELECT COUNT(DISTINCT user_agent) as uv FROM page_views WHERE created_at >= ? AND user_agent != ''",
    )
      .bind(todayStart)
      .first();

    // ── Hourly breakdown ──
    const hourlyQueryTs = range === "today" ? todayStart : pastStart;
    const hourlyRaw: any = await context.env.DB.prepare(
      `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour,
              COUNT(*) as pv
       FROM page_views
       WHERE created_at >= ?
       GROUP BY hour
       ORDER BY hour`,
    )
      .bind(hourlyQueryTs)
      .all();

    const uvHourlyRaw: any = await context.env.DB.prepare(
      `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour,
              COUNT(DISTINCT user_agent) as uv
       FROM page_views
       WHERE created_at >= ? AND user_agent != ''
       GROUP BY hour
       ORDER BY hour`,
    )
      .bind(hourlyQueryTs)
      .all();

    const pvMap = new Map(hourlyRaw.results?.map((r: any) => [r.hour, r.pv]) || []);
    const uvMap = new Map(uvHourlyRaw.results?.map((r: any) => [r.hour, r.uv]) || []);

    const hourlySum: { hour: number; pv: number; uv: number }[] = [];
    for (let h = 0; h < 24; h++) {
      hourlySum.push({
        hour: h,
        pv: pvMap.get(h) || 0,
        uv: uvMap.get(h) || 0,
      });
    }

    // For multi-day views, also compute hourly daily averages
    const hoursCovered = range === "today" ? 1 : days;
    const hourlyAvg = hourlySum.map((h) => ({
      hour: h.hour,
      pv: Math.round(h.pv / hoursCovered),
      uv: Math.round(h.uv / hoursCovered),
    }));

    // ── Daily breakdown (for 7d / 30d) ──
    const dailyRaw: any = await context.env.DB.prepare(
      `SELECT DATE(created_at) as date,
              COUNT(*) as pv,
              COUNT(DISTINCT user_agent) as uv
       FROM page_views
       WHERE created_at >= ? AND user_agent != ''
       GROUP BY date
       ORDER BY date`,
    )
      .bind(pastStart)
      .all();

    // ── Geographic distribution ──
    const geoRaw: any = await context.env.DB.prepare(
      `SELECT country, COUNT(*) as count
       FROM page_views
       WHERE created_at >= ? AND country != '' AND country IS NOT NULL
       GROUP BY country
       ORDER BY count DESC
       LIMIT 20`,
    )
      .bind(pastStart)
      .all();

    // ── Page breakdown ──
    const pagesRaw: any = await context.env.DB.prepare(
      `SELECT path, COUNT(*) as count
       FROM page_views
       WHERE created_at >= ?
       GROUP BY path
       ORDER BY count DESC
       LIMIT 20`,
    )
      .bind(pastStart)
      .all();

    // ── Channel source / referrer breakdown ──
    // Categorize referrers into channels using SQL CASE
    const channelsRaw: any = await context.env.DB.prepare(
      `SELECT
        CASE
          WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
          WHEN referrer LIKE '%google.%' OR referrer LIKE '%bing.%' OR referrer LIKE '%baidu.%' OR referrer LIKE '%yandex.%' OR referrer LIKE '%duckduckgo.%' OR referrer LIKE '%sogou.%' OR referrer LIKE '%360.%' THEN 'Search'
          WHEN referrer LIKE '%facebook.%' OR referrer LIKE '%twitter.%' OR referrer LIKE '%x.com%' OR referrer LIKE '%linkedin.%' OR referrer LIKE '%instagram.%' OR referrer LIKE '%pinterest.%' OR referrer LIKE '%reddit.%' OR referrer LIKE '%weixin.%' OR referrer LIKE '%weibo.%' OR referrer LIKE '%youtube.%' THEN 'Social'
          WHEN referrer LIKE '%sinotradecompliance.%' OR referrer LIKE '%compli-service.%' OR referrer LIKE '%trade-web-%' THEN 'Internal'
          ELSE 'Referral'
        END AS channel,
        COUNT(*) as count
       FROM page_views
       WHERE created_at >= ?
       GROUP BY channel
       ORDER BY count DESC`,
    )
      .bind(pastStart)
      .all();

    // ── Project breakdown ──
    const projectsRaw: any = await context.env.DB.prepare(
      `SELECT project, COUNT(*) as count
       FROM page_views
       WHERE created_at >= ?
       GROUP BY project
       ORDER BY count DESC`,
    )
      .bind(pastStart)
      .all();

    return Response.json({
      summary: {
        total: total?.pv || 0,
        uv: uniqueVisitors?.uv || 0,
        today: todayStats?.pv || 0,
        todayUV: todayUV?.uv || 0,
        countries: total?.countries || 0,
      },
      hourlySum,
      hourlyAvg,
      hoursCovered,
      dailyData: dailyRaw.results || [],
      geoData: geoRaw.results || [],
      pageData: pagesRaw.results || [],
      channelData: channelsRaw.results || [],
      projectData: projectsRaw.results || [],
    });
  } catch (err: any) {
    // Return empty data instead of error — the dashboard should handle gracefully
    return Response.json({
      summary: { total: 0, uv: 0, today: 0, todayUV: 0, countries: 0 },
      hourlyData: [],
      dailyData: [],
      geoData: [],
      pageData: [],
      projectData: [],
    });
  }
}
