/**
 * Subscriptions API
 * GET  /api/admin/subscriptions               — list (with pagination ?page=&pageSize=)
 * GET  /api/admin/subscriptions?id=xxx        — single subscription detail
 * POST /api/admin/subscriptions               — add subscription (by email)
 * POST /api/admin/subscriptions?id=xxx        — change status (body: { status })
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
  const subId = url.searchParams.get("id");

  // ── POST /api/admin/subscriptions?id=xxx — change status ──
  if (context.request.method === "POST" && subId) {
    const { status } = await context.request.json();

    if (!["active", "past_due", "expired", "canceled"].includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    await context.env.DB.prepare("UPDATE subscriptions SET status = ? WHERE id = ?")
      .bind(status, subId)
      .run();

    const sub: any = await context.env.DB.prepare(
      `SELECT s.*, u.email as user_email FROM subscriptions s
       LEFT JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
    )
      .bind(subId)
      .first();

    await createLog(context.env.DB, {
      adminId: admin.adminId,
      adminName: admin.name,
      action: status === "canceled" ? "cancel_subscription" : "modify_subscription",
      targetType: "subscription",
      targetId: subId,
      targetSummary: `${sub?.user_email || subId} → ${status}`,
      detail: JSON.stringify({ subscriptionId: subId, newStatus: status, plan: sub?.plan }),
    });

    return Response.json({ ok: true });
  }

  // ── GET /api/admin/subscriptions?id=xxx — single detail ──
  if (context.request.method === "GET" && subId) {
    const sub: any = await context.env.DB.prepare(
      `SELECT s.*, u.email as user_email, u.name as user_name, u.locale as user_locale
       FROM subscriptions s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`
    ).bind(subId).first();

    if (!sub) {
      return Response.json({ error: "Subscription not found" }, { status: 404 });
    }

    const payments: any = await context.env.DB.prepare(
      `SELECT id, amount_cents, currency, status, provider_payment_id, created_at
       FROM payments
       WHERE provider_subscription_id = ?
       ORDER BY created_at DESC LIMIT 20`
    ).bind(sub.provider_subscription_id).all();

    return Response.json({
      subscription: sub,
      payments: payments.results || [],
    });
  }

  // ── GET /api/admin/subscriptions — list with pagination ──
  if (context.request.method === "GET") {
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "25")));
    const offset = (page - 1) * pageSize;

    const countRow: any = await context.env.DB.prepare(
      `SELECT COUNT(*) as total FROM subscriptions s LEFT JOIN users u ON u.id = s.user_id`
    ).first();
    const total = countRow?.total || 0;

    const rows: any = await context.env.DB.prepare(
      `SELECT s.*, u.email as user_email, u.name as user_name
       FROM subscriptions s
       LEFT JOIN users u ON u.id = s.user_id
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
    ).bind(pageSize, offset).all();

    return Response.json({
      subscriptions: rows.results || [],
      total,
      page,
      pageSize,
    });
  }

  // ── POST /api/admin/subscriptions (add new — by email) ──
  if (context.request.method === "POST" && !subId) {
    const { email, plan, startDate, endDate } = await context.request.json();

    if (!email || !plan) {
      return Response.json({ error: "email and plan required" }, { status: 400 });
    }
    if (!startDate || !endDate) {
      return Response.json({ error: "startDate and endDate required" }, { status: 400 });
    }

    // Look up user by email
    const user: any = await context.env.DB.prepare(
      "SELECT id, email, name FROM users WHERE email = ?"
    ).bind(email).first();

    if (!user) {
      return Response.json({ error: "User not found with this email" }, { status: 404 });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await context.env.DB.prepare(
      `INSERT INTO subscriptions (id, user_id, plan, status, provider_subscription_id, current_period_start, current_period_end, created_at)
       VALUES (?, ?, ?, 'active', 'manual', ?, ?, ?)`,
    )
      .bind(id, user.id, plan, startDate, endDate, now)
      .run();

    await createLog(context.env.DB, {
      adminId: admin.adminId,
      adminName: admin.name,
      action: "add_subscription",
      targetType: "subscription",
      targetId: id,
      targetSummary: `${user.email} - ${plan}`,
      detail: JSON.stringify({ email: user.email, userId: user.id, plan, startDate, endDate }),
    });

    return Response.json({ id, ok: true });
  }

  return new Response("Method not allowed", { status: 405 });
}
