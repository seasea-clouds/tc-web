/**
 * Dashboard API
 * GET /api/admin/dashboard?range=today|7d|30d
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
    // Get total counts from DB
    const userCount: any = await context.env.DB.prepare("SELECT COUNT(*) as count FROM users").first();
    const subCount: any = await context.env.DB.prepare("SELECT COUNT(*) as count FROM subscriptions").first();
    const activeSubCount: any = await context.env.DB.prepare(
      "SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'",
    ).first();
    const reportCount: any = await context.env.DB.prepare("SELECT COUNT(*) as count FROM reports").first();

    // For dashboard stats, we'll use CF Analytics via GraphQL
    // For now, return DB counts + placeholder
    return Response.json({
      today: {
        pv: 0,
        uv: 0,
        visitors: 0,
        avgDuration: "0s",
      },
      totalUsers: userCount?.count || 0,
      totalSubscriptions: subCount?.count || 0,
      activeSubscriptions: activeSubCount?.count || 0,
      totalReports: reportCount?.count || 0,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
