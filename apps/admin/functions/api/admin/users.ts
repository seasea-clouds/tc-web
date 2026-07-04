/**
 * Users API
 * GET /api/admin/users?page=1&pageSize=20&search=
 * POST /api/admin/users/:id/status
 */

import { requireAdmin, getAdminSessionId, verifyAdminSession } from "../../lib/admin-session";
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

  // GET /api/admin/users
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
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(String(pageSize), String(offset));

    const [rows, countResult]: any = await Promise.all([
      context.env.DB.prepare(query).bind(...params).all(),
      context.env.DB.prepare(countQuery).bind(...(search ? [`%${search}%`, `%${search}%`] : [])).first(),
    ]);

    return Response.json({
      users: rows.results || [],
      total: countResult?.count || 0,
    });
  }

  // POST /api/admin/users/:id/status
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
