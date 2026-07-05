/**
 * Reports API
 * GET /api/admin/reports               — list (with module/status filter)
 * GET /api/admin/reports/:id           — single report detail (full data)
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
  const pathParts = url.pathname.split("/").filter(Boolean);
  // pathParts: ["api", "admin", "reports", ":id"]

  // ── GET /api/admin/reports/:id — single report detail ──
  if (pathParts.length >= 4 && pathParts[3]) {
    const reportId = pathParts[3];

    const row: any = await context.env.DB.prepare(
      `SELECT r.*, u.name as user_name, u.email as user_email
       FROM reports r
       LEFT JOIN users u ON u.email = r.user_email
       WHERE r.id = ?`
    ).bind(reportId).first();

    if (!row) {
      return Response.json({ error: "Report not found" }, { status: 404 });
    }

    // Parse JSON fields
    let inputData = null;
    let resultData = null;
    try { inputData = JSON.parse(row.input_data || "{}"); } catch {}
    try { resultData = JSON.parse(row.result_data || "{}"); } catch {}

    return Response.json({
      id: row.id,
      module: row.module,
      product_name: row.product_name,
      hs_code: row.hs_code,
      origin_country: row.origin_country,
      payment_status: row.payment_status,
      payment_id: row.payment_id,
      pdf_path: row.pdf_path || "",
      locale: row.locale,
      user_email: row.user_email || "",
      user_name: row.user_name || "",
      guest_token: row.guest_token || "",
      created_at: row.created_at,
      input_data: inputData,
      result_data: resultData,
    });
  }

  // ── GET /api/admin/reports — list ──
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
