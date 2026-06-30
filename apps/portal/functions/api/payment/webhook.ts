/**
 * Creem 支付 Webhook
 *
 * POST /api/payment/webhook
 * On checkout.completed:
 *   1. Verify HMAC-SHA256 signature
 *   2. Generate PDF via /api/report/generate-pdf
 *   3. Send email via /api/report/send-email
 *   4. Create or update user subscription record
 */

import {
  MODULE_RESOLVERS,
  getModuleLabel,
  buildEmailHtml,
  bufferToBase64,
} from "../../lib/report-common";

interface Env {
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  CREEM_WEBHOOK_SECRET: string;
  DB: any;  // D1Database
  R2?: any; // R2Bucket
}

// ─── HMAC-SHA256 签名验证 ──────────────────────────────────────────────

async function verifySignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = new Uint8Array(signature.length / 2);
    for (let i = 0; i < signature.length; i += 2) {
      sigBytes[i / 2] = parseInt(signature.substring(i, i + 2), 16);
    }
    const bodyBytes = encoder.encode(body);
    return await crypto.subtle.verify("HMAC", key, sigBytes, bodyBytes);
  } catch {
    return false;
  }
}

// ─── 主处理函数 ──────────────────────────────────────────────────────

export async function onRequest(context: { request: Request; env: Env }) {
  if (context.request.method !== "POST") {
    // GET: return recent webhook logs for debugging
    if (context.request.method === "GET") {
      return await handleDebugLogs(env);
    }
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const bodyText = await context.request.text();
    const payload = JSON.parse(bodyText);
    const signature =
      context.request.headers.get("x-creem-signature") ?? "";

    // ── Log full payload for debugging ────────────────────────────
    console.log("=== CREEM WEBHOOK RECEIVED ===");
    console.log("Signature:", signature ? signature.substring(0, 16) + "..." : "(none)");
    console.log("Payload type:", payload.type);
    console.log("Payload keys:", Object.keys(payload));
    console.log("Payload.data keys:", payload.data ? Object.keys(payload.data) : "(no data)");
    console.log("Payload.data.metadata:", payload.data?.metadata || "(none)");
    console.log("Payload.data.customer:", JSON.stringify(payload.data?.customer || "(none)").substring(0, 200));
    console.log("Payload.data.subscription:", payload.data?.subscription ? "present" : "(none)");
    console.log("Payload.data.subscription_id:", payload.data?.subscription_id || "(none)");
    console.log("Payload.data.id:", payload.data?.id || "(none)");

    // ── Store in D1 for later inspection ──────────────────────────
    try {
      await env.DB?.prepare(
        "CREATE TABLE IF NOT EXISTS webhook_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, payload TEXT, metadata TEXT, created_at TEXT DEFAULT (datetime('now')))"
      ).run();
      await env.DB?.prepare(
        "INSERT INTO webhook_logs (type, payload, metadata) VALUES (?, ?, ?)"
      ).bind(
        payload.type || "unknown",
        JSON.stringify(payload).substring(0, 3000),
        JSON.stringify(payload.data?.metadata || {})
      ).run();
      // Keep only last 20 logs
      await env.DB?.prepare(
        "DELETE FROM webhook_logs WHERE id NOT IN (SELECT id FROM webhook_logs ORDER BY id DESC LIMIT 20)"
      ).run();
    } catch (dbErr) {
      console.error("Failed to store webhook log:", dbErr);
    }

    if (context.env.CREEM_WEBHOOK_SECRET && signature) {
      const isValid = await verifySignature(
        bodyText,
        signature,
        context.env.CREEM_WEBHOOK_SECRET
      );
      console.log("Signature valid:", isValid);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const type = (payload.type ?? "") as string;
    const data = (payload.data ?? payload) as Record<string, unknown>;
    const meta = (data.metadata ?? {}) as Record<string, string>;

    console.log(`Creem webhook: ${type}`, { meta });
    console.log(`data.id=${data.id}, data.customer?.email=${(data as any).customer?.email || "(none)"}`);

    if (type === "checkout.completed") {
      await handleCheckoutCompleted(context.request, context.env, meta, data);
    } else if (type === "subscription.active") {
      await handleSubscriptionCreated(context.env, data, meta);
    } else if (type === "subscription.canceled") {
      await handleSubscriptionCancelled(context.env, data);
    } else {
      console.log(`Unhandled webhook type: "${type}"`);
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return Response.json({ error: String(err) }, { status: 400 });
  }
}

// ─── Debug endpoint: GET /api/payment/webhook ─────────────────────

async function handleDebugLogs(env: Env) {
  try {
    await env.DB?.prepare(
      "CREATE TABLE IF NOT EXISTS webhook_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, payload TEXT, metadata TEXT, created_at TEXT DEFAULT (datetime('now')))"
    ).run();

    const logs = await env.DB?.prepare(
      "SELECT id, type, metadata, substr(payload, 1, 500) as payload_preview, created_at FROM webhook_logs ORDER BY id DESC LIMIT 10"
    ).all();

    // Also show recent subscriptions
    const subs = await env.DB?.prepare(
      "SELECT id, user_id, plan, status, provider_subscription_id, current_period_start, current_period_end, created_at FROM subscriptions ORDER BY created_at DESC LIMIT 5"
    ).all();

    return Response.json({
      webhook_logs: logs?.results || [],
      recent_subscriptions: subs?.results || [],
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

// ─── checkout.completed 处理 ─────────────────────────────────────────

async function handleCheckoutCompleted(
  request: Request,
  env: Env,
  meta: Record<string, string>,
  data: Record<string, unknown>
) {
  const reportId = meta.report_id;
  const email = meta.email ?? "";
  const moduleKey = meta.module ?? "gacc";
  const locale = meta.locale ?? "en";

  if (!reportId) {
    // Not a report purchase — might be a subscription checkout.
    // checkout.completed fires BEFORE subscription.active for subscription checkouts.
    // The checkout object has metadata (user_id, email).
    // The subscription.active event may NOT carry this metadata.
    // So we create the subscription record here if data includes subscription info.
    const userId = meta.user_id ?? "";
    if (userId) {
      await handleSubscriptionFromCheckout(env, data, meta);
    }
    console.warn("checkout.completed: missing report_id in metadata", { userId: userId || "none" });
    return;
  }

  const inputData = {
    productName: meta.productName ?? "",
    category: meta.category ?? "",
    originCountry: meta.originCountry ?? "",
    hsCode: meta.hsCode ?? "",
    locale,
  };

  // Derive base URL from the incoming request (avoids hardcoding domain)
  const baseUrl = `${request.url.split('/').slice(0, 3).join('/')}`;

  // ── 1. Generate PDF (delegate) ──────────────────────────────────
  let pdfGenerated = false;
  let pdfPath = "";
  try {
    const pdfRes = await fetch(`${baseUrl}/api/report/generate-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, module: moduleKey, inputData }),
    });
    const pdfResult = await pdfRes.json();
    pdfGenerated = pdfResult.pdfGenerated ?? false;
    pdfPath = pdfResult.pdfPath ?? "";
    console.log(`generate-pdf result for ${reportId}: pdfGenerated=${pdfGenerated}`);
  } catch (pdfErr) {
    console.error("generate-pdf call failed:", pdfErr);
  }

  // ── 2. Send email (if email provided) ────────────────────────────
  let emailSent = false;
  if (email && env.RESEND_API_KEY) {
    try {
      // baseUrl already derived above
      const emailRes = await fetch(`${baseUrl}/api/report/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          email,
          module: moduleKey,
          inputData,
          locale,
        }),
      });
      const emailResult = await emailRes.json();
      emailSent = emailResult.emailSent ?? false;
      console.log(`send-email result for ${reportId}: emailSent=${emailSent}`);
    } catch (emailErr) {
      console.error("send-email call failed:", emailErr);
    }
  }

  // ── 3. Ensure D1 record is updated ───────────────────────────────
  if (env.DB && !pdfGenerated) {
    // Minimal record if PDF gen failed
    try {
      const existing = await env.DB.prepare(
        "SELECT id FROM reports WHERE id = ?"
      ).bind(reportId).first();

      if (!existing) {
        await env.DB.prepare(
          `INSERT INTO reports
            (id, module, product_name, origin_country, input_data, user_email, payment_status, locale)
          VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)`
        )
          .bind(
            reportId, moduleKey, inputData.productName,
            inputData.originCountry, JSON.stringify(inputData),
            email, locale
          )
          .run();
      }
    } catch (dbErr) {
      console.error("D1 fallback save failed:", dbErr);
    }
  }
}

// ─── Handle subscription from checkout.completed ──────────────────
// checkout.completed fires with checkout object that has metadata (user_id, email).
// Creem may also include the subscription reference in the checkout data.

async function handleSubscriptionFromCheckout(
  env: Env,
  data: Record<string, unknown>,
  meta: Record<string, string>
) {
  const userId = meta.user_id ?? "";
  const customerEmail = (data as any).customer?.email ?? meta.email ?? "";

  // Try to extract subscription id from checkout data
  const subId = String(
    (data as any).subscription_id ??
    (data as any).subscription?.id ??
    ""
  );

  if (!subId) {
    // No subscription info yet — checkout.completed fires before subscription is created
    // The subscription.active event will handle it later
    console.log("checkout.completed (subscription): no subscription_id yet, waiting for subscription.active");
    return;
  }

  const planId = String((data as any).plan?.id ?? "monthly");

  console.log(`checkout.completed (subscription): subId=${subId}, userId=${userId}, email=${customerEmail}`);

  try {
    const existing = await env.DB?.prepare(
      "SELECT id FROM subscriptions WHERE provider_subscription_id = ?"
    ).bind(subId).first();

    if (!existing && userId) {
      const newId = crypto.randomUUID();
      await env.DB?.prepare(
        `INSERT OR IGNORE INTO subscriptions (id, user_id, plan, status, provider_subscription_id)
         VALUES (?, ?, ?, 'active', ?)`
      ).bind(newId, userId, planId, subId).run();
      console.log(`checkout.completed: created subscription ${subId} for user ${userId}`);
    }
  } catch (err) {
    console.error("handleSubscriptionFromCheckout error:", err);
  }
}

// ─── subscription.created 处理 ────────────────────────────────────────

async function handleSubscriptionCreated(
  env: Env,
  data: Record<string, unknown>,
  meta: Record<string, string>
) {
  const subId = String(data.id ?? "");
  const customerEmail = String(
    (data as any).customer?.email ??
    (data as any).customer_email ??
    (data as any).owner?.email ??
    (data as any).email ??
    meta.email ??
    ""
  );
  const userId = meta.user_id ?? "";
  const periodStart = String((data as any).current_period_start ?? "");
  const periodEnd = String((data as any).current_period_end ?? "");
  const planId = String((data as any).plan?.id ?? "monthly");

  if (!subId || (!userId && !customerEmail)) {
    console.warn("subscription.created: missing subscription id or user id/email");
    return;
  }

  try {
    // Find user by userId from metadata, or by email
    let dbUserId = userId;
    if (!dbUserId && customerEmail && env.DB) {
      const user = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
        .bind(customerEmail).first();
      if (user) {
        dbUserId = (user as any).id;
      }
    }

    if (!dbUserId) {
      console.warn("subscription.created: could not resolve user_id for", { customerEmail });
      return;
    }

    // Check if subscription already exists
    const existing = await env.DB.prepare(
      "SELECT id FROM subscriptions WHERE provider_subscription_id = ?"
    ).bind(subId).first();

    if (existing) {
      // Update existing
      await env.DB.prepare(
        `UPDATE subscriptions SET status = 'active', current_period_start = ?, current_period_end = ? WHERE provider_subscription_id = ?`
      ).bind(periodStart, periodEnd, subId).run();
      console.log(`subscription.created: updated existing sub ${subId}`);
    } else {
      // Create new
      const newId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO subscriptions (id, user_id, plan, status, provider_subscription_id, current_period_start, current_period_end)
         VALUES (?, ?, ?, 'active', ?, ?, ?)`
      ).bind(newId, dbUserId, planId, subId, periodStart, periodEnd).run();
      console.log(`subscription.created: created new sub ${subId} for user ${dbUserId}`);
    }
  } catch (err) {
    console.error("subscription.created handler error:", err);
  }
}

// ─── subscription.cancelled 处理 ────────────────────────────────────────

async function handleSubscriptionCancelled(
  env: Env,
  data: Record<string, unknown>
) {
  const subId = String(data.id ?? "");

  if (!subId) {
    console.warn("subscription.cancelled: missing subscription id");
    return;
  }

  try {
    await env.DB.prepare(
      `UPDATE subscriptions SET status = 'cancelled' WHERE provider_subscription_id = ?`
    ).bind(subId).run();
    console.log(`subscription.cancelled: updated sub ${subId} to cancelled`);
  } catch (err) {
    console.error("subscription.cancelled handler error:", err);
  }
}
