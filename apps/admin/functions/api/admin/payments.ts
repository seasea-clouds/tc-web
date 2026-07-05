/**
 * Payments API
 * GET /api/admin/payments — list payments with search/filter/pagination
 * POST /api/admin/payments/:id/refund — refund a payment
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

  // ── POST /api/admin/payments/:id/refund — refund ──
  if (context.request.method === "POST") {
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
      const body = await context.request.json();
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
