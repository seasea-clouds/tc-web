/**
 * Users API
 * GET /api/admin/users                — list (with pagination/search)
 * GET /api/admin/users/:id            — single user detail
 * POST /api/admin/users/:id/status    — enable/disable user
 */

import { requireAdmin } from "../../lib/admin-session";
import { createLog } from "../../lib/log";

interface Env {
  DB: any;
}

export async function onRequest(context: { request: Request; env: Env }) {
  let admin;
  try {
    admin = await requireAdmin(context.request, context.env);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(context.request.url);
  const path = url.pathname;

  // ── GET /api/admin/users/:id — single user detail ──
  if (context.request.method === "GET") {
    const pathParts = path.split("/").filter(Boolean);
    // pathParts: ["api", "admin", "users", ":id"]

    if (pathParts.length >= 4 && pathParts[3] && !url.searchParams.has("page")) {
      const userId = pathParts[3];

      const user: any = await context.env.DB.prepare(
        `SELECT u.*,
          (SELECT COUNT(*) FROM reports r WHERE r.user_email = u.email) as report_count,
          (SELECT s.status FROM subscriptions s WHERE s.user_id = u.id ORDER BY s.created_at DESC LIMIT 1) as subscription_status,
          (SELECT s.plan FROM subscriptions s WHERE s.user_id = u.id ORDER BY s.created_at DESC LIMIT 1) as subscription_plan,
          (SELECT s.current_period_end FROM subscriptions s WHERE s.user_id = u.id ORDER BY s.created_at DESC LIMIT 1) as subscription_end
        FROM users u WHERE u.id = ?`
      ).bind(userId).first();

      if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
      }

      // Get user's recent reports
      const reports: any = await context.env.DB.prepare(
        `SELECT id, module, product_name, payment_status, created_at
         FROM reports WHERE user_email = ? ORDER BY created_at DESC LIMIT 20`
      ).bind(user.email).all();

      // Get user's subscriptions
      const subscriptions: any = await context.env.DB.prepare(
        `SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`
      ).bind(userId).all();

      return Response.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          locale: user.locale,
          status: user.status,
          created_at: user.created_at,
          report_count: user.report_count,
        },
        reports: reports.results || [],
        subscriptions: subscriptions.results || [],
      });
    }
  }

  // ── GET /api/admin/users — list ──
  if (context.request.method === "GET") {
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
    const search = url.searchParams.get("search") || "";
    const offset = (page - 1) * pageSize;

    let query = `SELECT u.id, u.email, u.name, u.locale, u.status, u.created_at,
      (SELECT COUNT(*) FROM reports r WHERE r.user_email = u.email) as report_count,
      (SELECT s.status FROM subscriptions s WHERE s.user_id = u.id ORDER BY s.created_at DESC LIMIT 1) as subscription_status
      FROM users u`;
    let countQuery = "SELECT COUNT(*) as count FROM users";
    const params: string[] = [];

    if (search) {
      query += ` WHERE u.email LIKE ? OR u.name LIKE ?`;
      countQuery += ` WHERE u.email LIKE ? OR u.name LIKE ?`;
      const q = `%${search}%`;
      params.push(q, q);
    }

    query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    const allParams = [...params, String(pageSize), String(offset)];

    const [rows, countResult]: any = await Promise.all([
      context.env.DB.prepare(query).bind(...allParams).all(),
      context.env.DB.prepare(countQuery).bind(...params).first(),
    ]);

    return Response.json({
      users: rows.results || [],
      total: countResult?.count || 0,
    });
  }

  // ── POST /api/admin/users/:id/status — enable/disable ──
  if (context.request.method === "POST") {
    const match = path.match(/\/users\/([^/]+)\/status$/);
    if (!match) {
      return Response.json({ error: "Invalid path" }, { status: 400 });
    }
    const userId = match[1];
    const { status } = await context.request.json();

    if (!["active", "disabled"].includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    await context.env.DB.prepare("UPDATE users SET status = ? WHERE id = ?")
      .bind(status, userId)
      .run();

    // Get user info for log
    const user: any = await context.env.DB.prepare("SELECT email, name FROM users WHERE id = ?")
      .bind(userId)
      .first();

    await createLog(context.env.DB, {
      adminId: admin.adminId,
      adminName: admin.name,
      action: status === "disabled" ? "disable_user" : "enable_user",
      targetType: "user",
      targetId: userId,
      targetSummary: user?.email || userId,
      detail: JSON.stringify({ userId, status, email: user?.email }),
    });

    return Response.json({ ok: true });
  }

  return new Response("Method not allowed", { status: 405 });
}
