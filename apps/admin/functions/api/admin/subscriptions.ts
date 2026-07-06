/**
 * Subscriptions API
 * GET  /api/admin/subscriptions            — list all
 * GET  /api/admin/subscriptions?id=xxx     — single subscription detail
 * POST /api/admin/subscriptions            — add subscription
 * POST /api/admin/subscriptions?id=xxx     — change status (body: { status })
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

  // ── GET /api/admin/subscriptions — list ──
  if (context.request.method === "GET") {
    const rows: any = await context.env.DB.prepare(
      `SELECT s.*, u.email as user_email, u.name as user_name
       FROM subscriptions s
       LEFT JOIN users u ON u.id = s.user_id
       ORDER BY s.created_at DESC`,
    ).all();

    return Response.json({ subscriptions: rows.results || [] });
  }

  // POST /api/admin/subscriptions (add new — no id param)
  if (context.request.method === "POST" && !subId) {
    const { userId, plan } = await context.request.json();

    if (!userId || !plan) {
      return Response.json({ error: "userId and plan required" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const periodEnd = new Date(Date.now() + (plan === "annual" ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString();

    await context.env.DB.prepare(
      `INSERT INTO subscriptions (id, user_id, plan, status, provider_subscription_id, current_period_start, current_period_end, created_at)
       VALUES (?, ?, ?, 'active', 'manual', ?, ?, ?)`,
    )
      .bind(id, userId, plan, now, periodEnd, now)
      .run();

    const user: any = await context.env.DB.prepare("SELECT email, name FROM users WHERE id = ?")
      .bind(userId)
      .first();

    await createLog(context.env.DB, {
      adminId: admin.adminId,
      adminName: admin.name,
      action: "add_subscription",
      targetType: "subscription",
      targetId: id,
      targetSummary: `${user?.email || userId} - ${plan}`,
      detail: JSON.stringify({ userId, plan, periodEnd }),
    });

    return Response.json({ id, ok: true });
  }

  return new Response("Method not allowed", { status: 405 });
}
