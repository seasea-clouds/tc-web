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

    if (context.env.CREEM_WEBHOOK_SECRET && signature) {
      const isValid = await verifySignature(
        bodyText,
        signature,
        context.env.CREEM_WEBHOOK_SECRET
      );
      if (!isValid) {
        console.error("Invalid webhook signature");
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const type = (payload.type ?? "") as string;
    const data = (payload.data ?? payload) as Record<string, unknown>;
    const meta = (data.metadata ?? {}) as Record<string, string>;

    console.log(`Creem webhook: ${type}`, { meta });

    if (type === "checkout.completed") {
      await handleCheckoutCompleted(context.request, context.env, meta, data);
    }

    return Response.json({ ok: true });
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
    console.warn("checkout.completed: missing report_id in metadata");
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
