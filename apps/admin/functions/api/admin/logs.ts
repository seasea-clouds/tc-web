/**
 * Logs API
 * GET /api/admin/logs?page=1&pageSize=30&search=&action=&dateFrom=&dateTo=
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
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "30");
  const search = url.searchParams.get("search") || "";
  const action = url.searchParams.get("action") || "";
  const dateFrom = url.searchParams.get("dateFrom") || "";
  const dateTo = url.searchParams.get("dateTo") || "";
  const offset = (page - 1) * pageSize;

  let query = `SELECT * FROM admin_logs WHERE 1=1`;
  let countQuery = `SELECT COUNT(*) as count FROM admin_logs WHERE 1=1`;
  const queryParams: string[] = [];
  const countParams: string[] = [];

  if (search) {
    query += ` AND (target_summary LIKE ? OR admin_name LIKE ? OR action LIKE ?)`;
    countQuery += ` AND (target_summary LIKE ? OR admin_name LIKE ? OR action LIKE ?)`;
    const searchPattern = `%${search}%`;
    queryParams.push(searchPattern, searchPattern, searchPattern);
    countParams.push(searchPattern, searchPattern, searchPattern);
  }

  if (action) {
    query += ` AND action = ?`;
    countQuery += ` AND action = ?`;
    queryParams.push(action);
    countParams.push(action);
  }

  if (dateFrom) {
    query += ` AND created_at >= ?`;
    countQuery += ` AND created_at >= ?`;
    queryParams.push(dateFrom);
    countParams.push(dateFrom);
  }

  if (dateTo) {
    query += ` AND created_at <= ?`;
    countQuery += ` AND created_at <= ?`;
    queryParams.push(dateTo + "T23:59:59");
    countParams.push(dateTo + "T23:59:59");
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  queryParams.push(String(pageSize), String(offset));

  const [rows, countResult]: any = await Promise.all([
    context.env.DB.prepare(query).bind(...queryParams).all(),
    context.env.DB.prepare(countQuery).bind(...countParams).first(),
  ]);

  return Response.json({
    logs: rows.results || [],
    total: countResult?.count || 0,
  });
}
