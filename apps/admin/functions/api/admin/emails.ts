/**
 * 邮件审核队列 API（管理后台）
 *
 * GET  /api/admin/emails?status=pending|approved|sent|rejected|failed|all&page=&pageSize=&q=
 * GET  /api/admin/emails?id=<queueId>      — 单条详情（含报告预览链接）
 * POST /api/admin/emails                   — { action, id?, ids?, reason? }
 *        action: approve | reject | retry | approve_bulk
 *
 * 设计要点：
 *   - 免费自查的报告邮件一律先入队（email_queue.status='pending'），人工审核后才发。
 *   - 「通过」只是把状态置为 approved；真正的投递由独立 Worker
 *     `tc-web-portal-email-cron`（每 5 分钟，调 portal /api/report/drain）完成，
 *     因为 Resend key 与报告生成逻辑都在 portal 项目里（admin 侧没有发信能力）。
 *   - 「拒绝」直接置 rejected，不再投递。失败（failed）可 retry 重排。
 *   - 所有动作写 admin_logs 审计。
 */

import { requireAdmin } from "../../lib/admin-session";
import { createLog } from "../../lib/log";

interface Env {
  DB: any;
}

const STATUSES = ["pending", "approved", "sent", "rejected", "failed"];

export async function onRequest(context: { request: Request; env: Env }) {
  let admin;
  try {
    admin = await requireAdmin(context.request, context.env);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!context.env.DB) {
    return Response.json({ error: "DB not configured" }, { status: 500 });
  }
  const db = context.env.DB;
  const url = new URL(context.request.url);

  // ── GET ───────────────────────────────────────────────────────────
  if (context.request.method === "GET") {
    const id = url.searchParams.get("id") || "";

    if (id) {
      const row: any = await db
        .prepare(
          `SELECT q.*, r.product_name, r.module AS report_module, r.user_email AS report_user_email,
                  r.guest_token, r.created_at AS report_created_at
           FROM email_queue q
           LEFT JOIN reports r ON r.id = q.report_id
           WHERE q.id = ?`
        )
        .bind(id)
        .first();
      if (!row) return Response.json({ error: "Not found" }, { status: 404 });
      const reportUrl =
        `https://sinotradecompliance.com/${row.locale || "en"}/c/report/?id=${encodeURIComponent(row.report_id)}` +
        (row.guest_token ? `&t=${encodeURIComponent(row.guest_token)}` : "");
      return Response.json({ email: { ...row, reportUrl } });
    }

    const status = url.searchParams.get("status") || "pending";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(5, parseInt(url.searchParams.get("pageSize") || "25", 10) || 25));
    const q = (url.searchParams.get("q") || "").trim();

    const where: string[] = [];
    const binds: any[] = [];
    if (status !== "all") {
      where.push("q.status = ?");
      binds.push(status);
    }
    if (q) {
      where.push("(q.to_email LIKE ? OR q.report_id LIKE ? OR q.module LIKE ?)");
      binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const totalRow: any = await db
      .prepare(`SELECT count(*) AS n FROM email_queue q ${whereSql}`)
      .bind(...binds)
      .first();

    const rows: any = await db
      .prepare(
        `SELECT q.id, q.report_id, q.to_email, q.module, q.locale, q.source, q.status,
                q.attempts, q.error, q.created_at, q.reviewed_at, q.reviewed_by, q.sent_at,
                r.product_name, r.user_email AS report_user_email, r.guest_token
         FROM email_queue q
         LEFT JOIN reports r ON r.id = q.report_id
         ${whereSql}
         ORDER BY
           CASE q.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 WHEN 'failed' THEN 2
                         WHEN 'sent' THEN 3 ELSE 4 END,
           q.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(...binds, pageSize, (page - 1) * pageSize)
      .all();

    const counts: Record<string, number> = {};
    const countRows: any = await db
      .prepare(`SELECT status, count(*) AS n FROM email_queue GROUP BY status`)
      .all();
    for (const s of STATUSES) counts[s] = 0;
    for (const r of countRows?.results || []) counts[r.status] = r.n;
    counts.all = Object.values(counts).reduce((a, b) => a + b, 0);

    const emails = (rows?.results || []).map((r: any) => ({
      ...r,
      reportUrl:
        `https://sinotradecompliance.com/${r.locale || "en"}/c/report/?id=${encodeURIComponent(r.report_id)}` +
        (r.guest_token ? `&t=${encodeURIComponent(r.guest_token)}` : ""),
      guest_token: undefined,
    }));

    return Response.json({ emails, total: totalRow?.n ?? 0, page, pageSize, counts, status });
  }

  // ── POST ──────────────────────────────────────────────────────────
  if (context.request.method === "POST") {
    let body: any = null;
    try {
      body = await context.request.json();
    } catch {}
    const action = body?.action;
    const ip = context.request.headers.get("CF-Connecting-IP") || "";
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.slice(0, 50) : body?.id ? [body.id] : [];

    if (!action || ids.length === 0) {
      return Response.json({ error: "Missing action or id" }, { status: 400 });
    }

    const rows: any = await db
      .prepare(
        `SELECT id, report_id, to_email, status FROM email_queue WHERE id IN (${ids.map(() => "?").join(",")})`
      )
      .bind(...ids)
      .all();
    const found = rows?.results || [];
    if (found.length === 0) return Response.json({ error: "Not found" }, { status: 404 });

    let changed = 0;
    for (const row of found) {
      if (action === "approve" || action === "approve_bulk") {
        if (row.status === "sent") continue;
        const res: any = await db
          .prepare(
            `UPDATE email_queue SET status = 'approved', reviewed_at = datetime('now'), reviewed_by = ?, error = NULL
             WHERE id = ?`
          )
          .bind(admin.username, row.id)
          .run();
        if (res?.meta?.changes > 0) changed++;
      } else if (action === "reject") {
        const res: any = await db
          .prepare(
            `UPDATE email_queue SET status = 'rejected', reviewed_at = datetime('now'), reviewed_by = ?, error = ?
             WHERE id = ?`
          )
          .bind(admin.username, body?.reason || null, row.id)
          .run();
        if (res?.meta?.changes > 0) changed++;
      } else if (action === "retry") {
        const res: any = await db
          .prepare(
            `UPDATE email_queue SET status = 'approved', attempts = 0, error = NULL,
                    reviewed_at = datetime('now'), reviewed_by = ? WHERE id = ?`
          )
          .bind(admin.username, row.id)
          .run();
        if (res?.meta?.changes > 0) changed++;
      } else {
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
      }

      await createLog(db, {
        adminId: admin.adminId,
        adminName: admin.name,
        action: `email.${action}`,
        targetType: "email_queue",
        targetId: row.id,
        targetSummary: `${row.to_email} (report ${row.report_id}) ${row.status} → ${action}`,
        ip,
      });
    }

    return Response.json({ ok: true, action, changed });
  }

  return new Response("Method not allowed", { status: 405 });
}
