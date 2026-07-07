/**
 * Reports API
 * GET /api/admin/reports             — list (with pagination, module/status filter)
 * GET /api/admin/reports?id=xxx      — single report detail
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
  const reportId = url.searchParams.get("id") || "";
  const moduleFilter = url.searchParams.get("module") || "";
  const statusFilter = url.searchParams.get("status") || "";

  // Single report detail
  if (reportId) {
    const row: any = await context.env.DB.prepare(`
      SELECT r.id, r.module, r.product_name, r.hs_code, r.origin_country,
        r.payment_status, r.pdf_path, r.locale, r.created_at,
        r.user_email, u.name as user_name,
        r.input_data, r.result_data
      FROM reports r
      LEFT JOIN users u ON u.email = r.user_email
      WHERE r.id = ?
    `).bind(reportId).first();

    if (!row) {
      return Response.json({ error: "Report not found" }, { status: 404 });
    }

    return Response.json({
      id: row.id,
      module: row.module,
      product_name: row.product_name,
      hs_code: row.hs_code || "",
      origin_country: row.origin_country || "",
      payment_status: row.payment_status,
      pdf_path: row.pdf_path || "",
      locale: row.locale || "en",
      user_email: row.user_email,
      user_name: row.user_name || "",
      created_at: row.created_at,
      input_data: row.input_data ? JSON.parse(row.input_data) : null,
      result_data: row.result_data ? JSON.parse(row.result_data) : null,
    });
  }

  // List with pagination
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "25")));
  const offset = (page - 1) * pageSize;

  let countQuery = `SELECT COUNT(*) as total FROM reports r WHERE 1=1`;
  let query = `SELECT r.id, r.module, r.product_name, r.payment_status, r.locale, r.created_at,
    r.user_email, u.name as user_name
    FROM reports r
    LEFT JOIN users u ON u.email = r.user_email
    WHERE 1=1`;
  const params: string[] = [];
  const countParams: string[] = [];

  if (moduleFilter) {
    query += ` AND r.module = ?`;
    countQuery += ` AND r.module = ?`;
    params.push(moduleFilter);
    countParams.push(moduleFilter);
  }
  if (statusFilter) {
    query += ` AND r.payment_status = ?`;
    countQuery += ` AND r.payment_status = ?`;
    params.push(statusFilter);
    countParams.push(statusFilter);
  }

  const countRow: any = await context.env.DB.prepare(countQuery).bind(...countParams).first();
  const total = countRow?.total || 0;

  query += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
  params.push(String(pageSize), String(offset));

  const rows: any = await context.env.DB.prepare(query).bind(...params).all();

  return Response.json({
    reports: rows.results || [],
    total,
    page,
    pageSize,
  });
}
