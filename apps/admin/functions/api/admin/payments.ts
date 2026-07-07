/**
 * Payments API
 * GET  /api/admin/payments               — list payments with search/filter/pagination
 * GET  /api/admin/payments/summary       — revenue summary (today/month/total + trend)
 * POST /api/admin/payments/:id/refund    — refund a payment
 * POST /api/admin/payments               — create manual payment record
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

  // ── GET /api/admin/payments/summary — revenue overview ──
  if (context.request.method === "GET" && path.endsWith("/payments/summary")) {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

    // Today's revenue
    const todayResult: any = await context.env.DB.prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) as today_revenue,
              COUNT(*) as today_count
       FROM payments
       WHERE status = 'completed' AND date(created_at) = ?`
    ).bind(today).first();

    // This month's revenue
    const monthResult: any = await context.env.DB.prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) as month_revenue,
              COUNT(*) as month_count
       FROM payments
       WHERE status = 'completed' AND date(created_at) >= ?`
    ).bind(monthStart).first();

    // All-time revenue
    const totalResult: any = await context.env.DB.prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) as total_revenue,
              COUNT(*) as total_count
       FROM payments
       WHERE status = 'completed'`
    ).first();

    // Monthly revenue trend (last 12 months)
    const trend: any = await context.env.DB.prepare(
      `SELECT strftime('%Y-%m', created_at) as month,
              COALESCE(SUM(amount_cents), 0) as amount
       FROM payments
       WHERE status = 'completed' AND created_at >= date('now', '-12 months')
       GROUP BY month
       ORDER BY month ASC`
    ).all();

    return Response.json({
      today: {
        revenue: todayResult?.today_revenue || 0,
        count: todayResult?.today_count || 0,
      },
      month: {
        revenue: monthResult?.month_revenue || 0,
        count: monthResult?.month_count || 0,
      },
      total: {
        revenue: totalResult?.total_revenue || 0,
        count: totalResult?.total_count || 0,
      },
      trend: trend.results || [],
    });
  }

  // ── GET /api/admin/payments — list ──
  if (context.request.method === "GET") {
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") || "20"), 100);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";
    const offset = (page - 1) * pageSize;

    let where = "WHERE 1=1";
    const bindings: any[] = [];

    if (search) {
      where += " AND (p.user_email LIKE ? OR p.id LIKE ? OR r.product_name LIKE ?)";
      const q = `%${search}%`;
      bindings.push(q, q, q);
    }
    if (status) {
      where += " AND p.status = ?";
      bindings.push(status);
    }

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payments p
      LEFT JOIN reports r ON r.id = p.report_id
      ${where}
    `;
    const countResult: any = await context.env.DB.prepare(countQuery).bind(...bindings).first();

    // Fetch page
    const dataQuery = `
      SELECT p.*, r.product_name, r.module as report_module
      FROM payments p
      LEFT JOIN reports r ON r.id = p.report_id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const result: any = await context.env.DB.prepare(dataQuery)
      .bind(...bindings, pageSize, offset)
      .all();

    return Response.json({
      payments: result.results || [],
      total: countResult?.total || 0,
      page,
      pageSize,
    });
  }

  // ── POST /api/admin/payments — backfill or create manual ──
  if (context.request.method === "POST") {
    const body = await context.request.json();

    // ── Backfill: action === 'backfill' ──
    if (body.action === 'backfill') {
      const { reportId: specificReportId } = body;

      let query: string;
      let bindings: any[];

      if (specificReportId) {
        query = `SELECT id, user_email, created_at FROM reports WHERE id = ? AND payment_status = 'completed'`;
        bindings = [specificReportId];
      } else {
        query = `SELECT r.id, r.user_email, r.created_at FROM reports r
                 LEFT JOIN payments p ON p.report_id = r.id
                 WHERE r.payment_status = 'completed' AND p.id IS NULL`;
        bindings = [];
      }

      const missing: any = await context.env.DB.prepare(query).bind(...bindings).all();
      const rows = missing.results || [];
      let inserted = 0;

      for (const row of rows) {
        const paymentId = crypto.randomUUID();
        const now = new Date().toISOString();
        try {
          await context.env.DB.prepare(
            `INSERT OR IGNORE INTO payments (id, report_id, user_email, amount_cents, currency, status, provider, provider_payment_id, created_at)
             VALUES (?, ?, ?, 199, 'USD', 'completed', 'backfill', ?, ?)`
          ).bind(paymentId, row.id, row.user_email || null, row.id, now).run();
          inserted++;
        } catch {
          // skip duplicates
        }
      }

      return Response.json({
        ok: true,
        found: rows.length,
        inserted,
        message: `从 ${rows.length} 条已完成报告中补录了 ${inserted} 条支付记录`,
      });
    }

    // ── Refund: /payments/:id/refund ──
    const match = path.match(/\/payments\/([^/]+)\/refund$/);
    if (match) {
      const paymentId = match[1];
      const now = new Date().toISOString();

      await context.env.DB.prepare(
        "UPDATE payments SET status = 'refunded', refunded_at = ? WHERE id = ?",
      )
        .bind(now, paymentId)
        .run();

      // Also update the associated report's payment_status
      const payment: any = await context.env.DB.prepare(
        "SELECT report_id, user_email, amount_cents FROM payments WHERE id = ?",
      )
        .bind(paymentId)
        .first();

      if (payment?.report_id) {
        await context.env.DB.prepare(
          "UPDATE reports SET payment_status = 'refunded' WHERE id = ?",
        )
          .bind(payment.report_id)
          .run();
      }

      await createLog(context.env.DB, {
        adminId: admin.adminId,
        adminName: admin.name,
        action: "refund_payment",
        targetType: "payment",
        targetId: paymentId,
        targetSummary: `${payment?.user_email || paymentId} - $${(payment?.amount_cents || 0) / 100}`,
        detail: JSON.stringify({ paymentId, amountCents: payment?.amount_cents }),
      });

      return Response.json({ ok: true });
    }

    // ── POST /api/admin/payments — create manual payment record ──
    if (!match) {
      const { reportId, userEmail, amountCents, currency, paymentId: providerPaymentId } = body;

      if (!amountCents || !userEmail) {
        return Response.json({ error: "amountCents and userEmail required" }, { status: 400 });
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      await context.env.DB.prepare(
        `INSERT INTO payments (id, report_id, user_email, amount_cents, currency, status, provider, provider_payment_id, created_at)
         VALUES (?, ?, ?, ?, ?, 'completed', 'manual', ?, ?)`,
      )
        .bind(id, reportId || null, userEmail, amountCents, currency || "USD", providerPaymentId || "", now)
        .run();

      if (reportId) {
        await context.env.DB.prepare("UPDATE reports SET payment_status = 'completed' WHERE id = ?")
          .bind(reportId)
          .run();
      }

      return Response.json({ id, ok: true });
    }
  }

  return new Response("Method not allowed", { status: 405 });
}
