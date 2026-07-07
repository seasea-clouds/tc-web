/**
 * Dashboard API
 * GET /api/admin/dashboard?range=today|7d|30d
 * Returns aggregated stats + chart data from D1
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
    // ── Overview counts ──
    const [userCount, subCount, activeSubCount, reportCount]: any[] = await Promise.all([
      context.env.DB.prepare("SELECT COUNT(*) as count FROM users").first(),
      context.env.DB.prepare("SELECT COUNT(*) as count FROM subscriptions").first(),
      context.env.DB.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'").first(),
      context.env.DB.prepare("SELECT COUNT(*) as count FROM reports").first(),
    ]);

    // ── Today's report stats (proxy for traffic until CF Analytics is integrated) ──
    const today = new Date();
    const todayStart = today.toISOString().slice(0, 10) + " 00:00:00";

    const todayReports: any = await context.env.DB.prepare(
      "SELECT COUNT(*) as count FROM reports WHERE created_at >= ?",
    ).bind(todayStart).first();

    const todayUsers: any = await context.env.DB.prepare(
      "SELECT COUNT(*) as count FROM users WHERE created_at >= ?",
    ).bind(todayStart).first();

    // ── Hourly breakdown (today) ──
    let hourlyData: { hour: number; reports: number; users: number }[] = [];
    if (range === "today") {
      const hourly: any = await context.env.DB.prepare(
        `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour,
                COUNT(*) as count
         FROM reports
         WHERE created_at >= ?
         GROUP BY hour
         ORDER BY hour`,
      ).bind(todayStart).all();

      const userHourly: any = await context.env.DB.prepare(
        `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour,
                COUNT(*) as count
         FROM users
         WHERE created_at >= ?
         GROUP BY hour
         ORDER BY hour`,
      ).bind(todayStart).all();

      const reportMap = new Map(hourly.results?.map((r: any) => [r.hour, r.count]) || []);
      const userMap = new Map(userHourly.results?.map((r: any) => [r.hour, r.count]) || []);

      for (let h = 0; h < 24; h++) {
        hourlyData.push({
          hour: h,
          reports: reportMap.get(h) || 0,
          users: userMap.get(h) || 0,
        });
      }
    }

    // ── Daily breakdown (for 7d / 30d) ──
    let days = range === "7d" ? 7 : range === "30d" ? 30 : 1;
    const pastStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const pastStartStr = pastStart.toISOString().slice(0, 10) + " 00:00:00";

    const daily: any = await context.env.DB.prepare(
      `SELECT DATE(created_at) as date,
              COUNT(*) as reports,
              COUNT(DISTINCT user_email) as unique_users
       FROM reports
       WHERE created_at >= ?
       GROUP BY date
       ORDER BY date`,
    ).bind(pastStartStr).all();

    // ── Module breakdown ──
    const modules: any = await context.env.DB.prepare(
      `SELECT module, COUNT(*) as count
       FROM reports
       WHERE created_at >= ?
       GROUP BY module
       ORDER BY count DESC`,
    ).bind(pastStartStr).all();

    // ── Payment status breakdown ──
    const statuses: any = await context.env.DB.prepare(
      `SELECT payment_status as status, COUNT(*) as count
       FROM reports
       WHERE created_at >= ?
       GROUP BY status
       ORDER BY count DESC`,
    ).bind(pastStartStr).all();

    return Response.json({
      // Today's proxy stats (reports = proxy for PV, unique users = proxy for UV)
      today: {
        pv: (todayReports?.count || 0) * 3, // Rough multiplier for page views
        uv: todayUsers?.count || 0,
        reports: todayReports?.count || 0,
        newUsers: todayUsers?.count || 0,
      },
      totalUsers: userCount?.count || 0,
      totalSubscriptions: subCount?.count || 0,
      activeSubscriptions: activeSubCount?.count || 0,
      totalReports: reportCount?.count || 0,
      // Chart data
      hourlyData: range === "today" ? hourlyData : [],
      dailyData: daily.results || [],
      moduleData: modules.results || [],
      statusData: statuses.results || [],
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
