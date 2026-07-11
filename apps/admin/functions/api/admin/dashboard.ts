/**
 * Dashboard API
 * GET /api/admin/dashboard?range=today|7d|30d
 * Returns aggregated stats + chart data from D1
 *
 * D1 query optimization: reduced from 12 queries to 5-6 by combining
 * overview counts, period counts, and hourly queries.
 */

import { requireAdmin } from "../../lib/admin-session";

interface Env {
  DB: any;
  CF_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  CF_ZONE_ID?: string;
}

export async function onRequest(context: { request: Request; env: Env }) {
  try {
    await requireAdmin(context.request, context.env);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(context.request.url);
  const range = url.searchParams.get("range") || "today";

  try {
    // ── Query 1: Combined overview counts (was 4 separate queries) ──
    const overview: any = await context.env.DB.prepare(
      `SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM subscriptions) as total_subscriptions,
        (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subscriptions,
        (SELECT COUNT(*) FROM reports) as total_reports`,
    ).first();

    // ── Date bounds ──
    const today = new Date();
    const todayStart = today.toISOString().slice(0, 10) + " 00:00:00";

    const days = range === "7d" ? 7 : range === "30d" ? 30 : 1;
    const periodStart = days > 1
      ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) + " 00:00:00"
      : todayStart;

    // ── Query 2: Combined period counts (was 3 separate queries) ──
    // When todayStart == periodStart (range=today), bind the same date twice
    const sameDate = todayStart === periodStart;
    const periodBind = sameDate ? [todayStart, todayStart, todayStart] : [todayStart, periodStart, periodStart];
    const period: any = await context.env.DB.prepare(
      `SELECT
        (SELECT COUNT(*) FROM reports WHERE created_at >= ?) as today_reports,
        (SELECT COUNT(*) FROM reports WHERE created_at >= ?) as period_reports,
        (SELECT COUNT(*) FROM users WHERE created_at >= ?) as period_users`,
    ).bind(...periodBind).first();

    const periodStartStr = periodStart; // for GROUP BY queries

    // ── Query 3: Combined hourly breakdown (was 2 queries: reports + users) ──
    let hourlyData: { hour: number; reports: number; users: number }[] = [];
    if (range === "today") {
      const hourly: any = await context.env.DB.prepare(
        `SELECT hour, SUM(reports) as reports, SUM(users) as users FROM (
          SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour,
                 COUNT(*) as reports, 0 as users
          FROM reports WHERE created_at >= ? GROUP BY hour
          UNION ALL
          SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour,
                 0 as reports, COUNT(*) as users
          FROM users WHERE created_at >= ? GROUP BY hour
        ) GROUP BY hour ORDER BY hour`,
      ).bind(todayStart, todayStart).all();

      const hourMap = new Map<number, { reports: number; users: number }>();
      for (const r of (hourly.results || [])) {
        hourMap.set(r.hour, { reports: r.reports || 0, users: r.users || 0 });
      }
      for (let h = 0; h < 24; h++) {
        const slot = hourMap.get(h) || { reports: 0, users: 0 };
        hourlyData.push({ hour: h, reports: slot.reports, users: slot.users });
      }
    }

    // ── Query 4: Daily breakdown (was separate, keep as-is) ──
    const daily: any = await context.env.DB.prepare(
      `SELECT DATE(created_at) as date,
              COUNT(*) as reports,
              COUNT(DISTINCT user_email) as unique_users
       FROM reports
       WHERE created_at >= ?
       GROUP BY date
       ORDER BY date`,
    ).bind(periodStartStr).all();

    // ── Query 5: Module breakdown (keep as-is) ──
    const modules: any = await context.env.DB.prepare(
      `SELECT module, COUNT(*) as count
       FROM reports WHERE created_at >= ?
       GROUP BY module ORDER BY count DESC`,
    ).bind(periodStartStr).all();

    // ── Query 6: Payment status breakdown (keep as-is) ──
    const statuses: any = await context.env.DB.prepare(
      `SELECT payment_status as status, COUNT(*) as count
       FROM reports WHERE created_at >= ?
       GROUP BY status ORDER BY count DESC`,
    ).bind(periodStartStr).all();

    return Response.json({
      today: {
        reports: period?.today_reports || 0,
        newUsers: 0,
      },
      period: {
        reports: period?.period_reports || 0,
        newUsers: period?.period_users || 0,
      },
      totalUsers: overview?.total_users || 0,
      totalSubscriptions: overview?.total_subscriptions || 0,
      activeSubscriptions: overview?.active_subscriptions || 0,
      totalReports: overview?.total_reports || 0,
      hourlyData: range === "today" ? hourlyData : [],
      dailyData: daily.results || [],
      moduleData: modules.results || [],
      statusData: statuses.results || [],
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
