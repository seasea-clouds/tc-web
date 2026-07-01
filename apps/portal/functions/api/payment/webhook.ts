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
    console.log("Payload.eventType:", payload.eventType);
    console.log("Payload keys:", Object.keys(payload));
    console.log("Payload.object keys:", payload.object ? Object.keys(payload.object) : "(no object)");
    console.log("Payload.object.metadata:", JSON.stringify(payload.object?.metadata || "(none)"));
    console.log("Payload.object.customer:", JSON.stringify(payload.object?.customer || "(none)").substring(0, 200));
    console.log("Payload.object.order?.customer:", payload.object?.order?.customer || "(none)");

    // ── Store in D1 for later inspection ──────────────────────────
    const d1Status: any = {};
    try {
      const db = context.env.DB;
      d1Status.hasDB = !!db;
      if (db) {
        await db.prepare(
          "CREATE TABLE IF NOT EXISTS webhook_logs (id INTEGER PRIMARY KEY, type TEXT, payload TEXT, metadata TEXT, created_at TEXT DEFAULT (datetime('now')))"
        ).run();
        d1Status.tableReady = true;
        await db.prepare(
          "INSERT INTO webhook_logs (type, payload, metadata) VALUES (?, ?, ?)"
        ).bind(
          payload.eventType || "unknown",
          JSON.stringify(payload).substring(0, 3000),
          JSON.stringify(payload.object?.metadata || {})
        ).run();
        d1Status.inserted = true;
        // Keep only last 20 logs
        await db.prepare(
          "DELETE FROM webhook_logs WHERE id NOT IN (SELECT id FROM webhook_logs ORDER BY id DESC LIMIT 20)"
        ).run();
        d1Status.cleaned = true;
      }
    } catch (dbErr) {
      d1Status.error = String(dbErr);
      console.error("Failed to store webhook log:", dbErr);
    }

    console.log("D1 status:", JSON.stringify(d1Status));

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

    // ── Creem uses { eventType, object } instead of { type, data } ─
    const eventType = (payload.eventType ?? "") as string;
    const webhookData = (payload.object ?? payload) as Record<string, unknown>;
    const meta = (webhookData.metadata ?? {}) as Record<string, string>;

    console.log(`Creem webhook: ${eventType}`, { meta });
    console.log(`data.id=${webhookData.id}, customer=${(webhookData as any).customer || (webhookData as any).order?.customer || "(none)"}`);

    if (eventType === "checkout.completed") {
      await handleCheckoutCompleted(context.request, context.env, meta, webhookData);
    } else if (eventType === "subscription.active") {
      await handleSubscriptionCreated(context.env, webhookData, meta);
    } else if (eventType === "subscription.canceled") {
      await handleSubscriptionCancelled(context.env, webhookData);
    } else if (eventType === "subscription.updated") {
      await handleSubscriptionUpdated(context.env, webhookData);
    } else {
      console.log(`Unhandled webhook eventType: "${eventType}"`);
    }

    return Response.json({ ok: true, d1: d1Status });
  } catch (err) {
    console.error("Webhook error:", err);
    return Response.json({ error: String(err) }, { status: 400 });
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
    // The checkout object (data) has the structure:
    // { id: "ch_xxx", object: "checkout", order: { customer: "cust_xxx", ... }, metadata: { user_id, email, locale } }
    // Save the customer mapping here so subscription.active can find the user.
    const userId = meta.user_id ?? "";
    const customerId = String((data as any).order?.customer ?? "");
    if (userId && customerId) {
      await saveCustomerMapping(env, customerId, userId, meta.email || "");
      console.log(`checkout.completed: saved customer mapping: ${customerId} -> ${userId}`);
    }
    if (userId) {
      await handleSubscriptionFromCheckout(env, data, meta);
    }
    console.warn("checkout.completed: missing report_id", { userId: userId || "none", customerId });
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

// ─── Save customer mapping (customer_id → user_id) ─────────────────
// checkout.completed has metadata with user_id. subscription.active
// has the same customer_id but no metadata. This mapping bridges them.

async function saveCustomerMapping(
  env: Env,
  creemCustomerId: string,
  userId: string,
  email: string
) {
  try {
    const db = env.DB;
    if (!db) return;
    await db.prepare(
      "CREATE TABLE IF NOT EXISTS customer_mapping (creem_customer_id TEXT PRIMARY KEY, user_id TEXT, email TEXT, created_at TEXT DEFAULT (datetime('now')))"
    ).run();
    await db.prepare(
      "INSERT OR REPLACE INTO customer_mapping (creem_customer_id, user_id, email) VALUES (?, ?, ?)"
    ).bind(creemCustomerId, userId, email).run();
  } catch (err) {
    console.error("saveCustomerMapping error:", err);
  }
}

// ─── Handle subscription from checkout.completed ──────────────────
// checkout.completed fires with checkout object that has metadata (user_id, email).
// At this point the subscription may not be created yet.

async function handleSubscriptionFromCheckout(
  env: Env,
  data: Record<string, unknown>,
  meta: Record<string, string>
) {
  const userId = meta.user_id ?? "";

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

  console.log(`checkout.completed (subscription): subId=${subId}, userId=${userId}`);

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

// ─── subscription.active 处理 ────────────────────────────────────────
// Creem subscription object structure:
// { id: "sub_xxx", object: "subscription", customer: { id: "cust_xxx", email: "..." },
//   status: "active", current_period_start: "...", current_period_end: "...", mode: "test" }

async function handleSubscriptionCreated(
  env: Env,
  data: Record<string, unknown>,
  meta: Record<string, string>
) {
  const subId = String(data.id ?? "");
  const custObj = (data as any).customer ?? {};
  const customerId = String(custObj.id ?? "");
  const customerEmail = String(custObj.email ?? "");
  const userId = meta.user_id ?? "";
  const periodStart = String((data as any).current_period_start_date ?? (data as any).current_period_start ?? "");
  const periodEnd = String((data as any).current_period_end_date ?? (data as any).current_period_end ?? "");
  const planId = String((data as any).plan?.id ?? "monthly");

  if (!subId) {
    console.warn("subscription.active: missing subscription id");
    return;
  }

  console.log(`subscription.active: subId=${subId}, customerId=${customerId}, email=${customerEmail}`);

  try {
    // Find user: from meta (checkout.completed might have created mapping),
    // or by customerId from customer_mapping table,
    // or by email lookup in users table
    let dbUserId = userId;

    if (!dbUserId && customerId && env.DB) {
      // Check customer_mapping table first
      try {
        const mapping = await env.DB.prepare(
          "SELECT user_id FROM customer_mapping WHERE creem_customer_id = ?"
        ).bind(customerId).first();
        if (mapping) {
          dbUserId = (mapping as any).user_id;
          console.log(`subscription.active: found user ${dbUserId} from customer_mapping`);
        }
      } catch { /* table may not exist yet */ }
    }

    if (!dbUserId && customerEmail && env.DB) {
      // Fall back to email lookup
      const user = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
        .bind(customerEmail).first();
      if (user) {
        dbUserId = (user as any).id;
        console.log(`subscription.active: found user ${dbUserId} by email lookup`);
      }
    }

    if (!dbUserId) {
      console.warn("subscription.active: could not resolve user_id", { customerId, customerEmail });
      return;
    }

    // Check if subscription already exists
    const existing = await env.DB.prepare(
      "SELECT id FROM subscriptions WHERE provider_subscription_id = ?"
    ).bind(subId).first();

    if (existing) {
      // Update existing — ensure new period starts day after old period ends
      let adjustedStart = periodStart;
      const oldEnd = (existing as any).current_period_end;
      if (oldEnd && periodStart) {
        const oldEndDate = new Date(oldEnd);
        const creemStartDate = new Date(periodStart);
        const expectedStart = new Date(oldEndDate);
        expectedStart.setDate(expectedStart.getDate() + 1);
        if (creemStartDate <= oldEndDate) {
          adjustedStart = expectedStart.toISOString().split('T')[0];
          console.log(`subscription.active: adjusted period_start from ${periodStart} to ${adjustedStart} (old period_end was ${oldEnd})`);
        }
      }
      await env.DB.prepare(
        `UPDATE subscriptions SET status = 'active', current_period_start = ?, current_period_end = ? WHERE provider_subscription_id = ?`
      ).bind(adjustedStart, periodEnd, subId).run();
      console.log(`subscription.active: updated existing sub ${subId}`);
    } else {
      // Create new
      const newId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO subscriptions (id, user_id, plan, status, provider_subscription_id, current_period_start, current_period_end)
         VALUES (?, ?, ?, 'active', ?, ?, ?)`
      ).bind(newId, dbUserId, planId, subId, periodStart, periodEnd).run();
      console.log(`subscription.active: created new sub ${subId} for user ${dbUserId}`);
    }
  } catch (err) {
    console.error("subscription.active handler error:", err);
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

// ─── subscription.updated 处理 ────────────────────────────────────────

async function handleSubscriptionUpdated(
  env: Env,
  data: Record<string, unknown>
) {
  const subId = String(data.id ?? "");
  const periodStart = String((data as any).current_period_start_date ?? (data as any).current_period_start ?? "");
  const periodEnd = String((data as any).current_period_end_date ?? (data as any).current_period_end ?? "");
  const status = String(data.status ?? "active");

  if (!subId || !periodStart || !periodEnd) {
    console.warn("subscription.updated: missing subId or period dates");
    return;
  }

  console.log(`subscription.updated: subId=${subId}, status=${status}`);

  try {
    // Fetch existing subscription to get old period end
    const existing = await env.DB.prepare(
      "SELECT id, current_period_end FROM subscriptions WHERE provider_subscription_id = ?"
    ).bind(subId).first();

    if (!existing) {
      console.warn(`subscription.updated: subscription ${subId} not found in DB`);
      return;
    }

    // Ensure new period starts day after old period ends
    let adjustedStart = periodStart;
    const oldEnd = (existing as any).current_period_end;
    if (oldEnd && periodStart) {
      const oldEndDate = new Date(oldEnd);
      const creemStartDate = new Date(periodStart);
      const expectedStart = new Date(oldEndDate);
      expectedStart.setDate(expectedStart.getDate() + 1);
      if (creemStartDate <= oldEndDate) {
        adjustedStart = expectedStart.toISOString().split('T')[0];
        console.log(`subscription.updated: adjusted period_start from ${periodStart} to ${adjustedStart} (old period_end was ${oldEnd})`);
      }
    }

    await env.DB.prepare(
      `UPDATE subscriptions SET status = ?, current_period_start = ?, current_period_end = ? WHERE provider_subscription_id = ?`
    ).bind(status, adjustedStart, periodEnd, subId).run();
    console.log(`subscription.updated: updated sub ${subId}`);
  } catch (err) {
    console.error("subscription.updated handler error:", err);
  }
}
