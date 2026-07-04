/**
 * Reports API
 * GET /api/admin/reports?module=&status=
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

  if (context.request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(context.request.url);
  const moduleFilter = url.searchParams.get("module") || "";
  const statusFilter = url.searchParams.get("status") || "";

  let query = `SELECT r.id, r.module, r.product_name, r.payment_status, r.locale, r.created_at,
    r.user_email, u.name as user_name
    FROM reports r
    LEFT JOIN users u ON u.email = r.user_email
    WHERE 1=1`;
  const params: string[] = [];

  if (moduleFilter) {
    query += ` AND r.module = ?`;
    params.push(moduleFilter);
  }
  if (statusFilter) {
    query += ` AND r.payment_status = ?`;
    params.push(statusFilter);
  }

  query += ` ORDER BY r.created_at DESC LIMIT 100`;

  const rows: any = await context.env.DB.prepare(query).bind(...params).all();

  return Response.json({ reports: rows.results || [] });
}
