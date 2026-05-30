/**
 * Creem 支付 Webhook
 *
 * POST /api/payment/webhook
 * On checkout.completed:
 *   1. Verify HMAC-SHA256 signature
 *   2. Generate compliance report (PDF)
 *   3. Upload PDF to R2
 *   4. Send confirmation email with PDF
 *   5. Save report to D1
 *   6. Create or update user subscription record
 */

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

// ─── Module resolver (dynamic imports, ESM-safe) ─────────────────────

const MODULE_RESOLVERS: Record<string, () => Promise<{
  checkFn: (input: any) => any;
  reportFn: (input: any) => any;
  moduleLabel: string;
}>> = {
  gacc: async () => {
    const { checkGacc } = await import("../../../modules/gacc/rules");
    const { generateGaccReport } = await import("../../../modules/gacc/report");
    return { checkFn: checkGacc, reportFn: generateGaccReport, moduleLabel: "GACC Food Registration" };
  },
  label: async () => {
    const { checkLabel } = await import("../../../modules/label/rules");
    const { generateLabelReport } = await import("../../../modules/label/report");
    return { checkFn: checkLabel, reportFn: generateLabelReport, moduleLabel: "Chinese Label Compliance" };
  },
  ccc: async () => {
    const { checkCcc } = await import("../../../modules/ccc/rules");
    const { generateCccReport } = await import("../../../modules/ccc/report");
    return { checkFn: checkCcc, reportFn: generateCccReport, moduleLabel: "CCC Certification" };
  },
  nmpa: async () => {
    const { checkCosmetics } = await import("../../../modules/nmpa/rules");
    const { generateCosmeticsReport } = await import("../../../modules/nmpa/report");
    return { checkFn: checkCosmetics, reportFn: generateCosmeticsReport, moduleLabel: "Cosmetics Filing (NMPA)" };
  },
  crossborder: async () => {
    const { checkCrossborder } = await import("../../../modules/crossborder/rules");
    const { generateCrossborderReport } = await import("../../../modules/crossborder/report");
    return { checkFn: checkCrossborder, reportFn: generateCrossborderReport, moduleLabel: "Cross-Border E-commerce" };
  },
  trademark: async () => {
    const { checkTrademark } = await import("../../../modules/trademark/rules");
    const { generateTrademarkReport } = await import("../../../modules/trademark/report");
    return { checkFn: checkTrademark, reportFn: generateTrademarkReport, moduleLabel: "Brand Protection" };
  },
};

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

    // Verify webhook signature
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
      await handleCheckoutCompleted(context.env, meta, data);
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return Response.json({ error: String(err) }, { status: 400 });
  }
}

// ─── checkout.completed 处理 ─────────────────────────────────────────

async function handleCheckoutCompleted(
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

  // Build input data from metadata (sent by CheckForm before redirect)
  const inputData = {
    productName: meta.productName ?? "",
    category: meta.category ?? "",
    originCountry: meta.originCountry ?? "",
    hsCode: meta.hsCode ?? "",
  };

  // Try to generate report
  const resolver = MODULE_RESOLVERS[moduleKey];
  if (resolver) {
    try {
      const { checkFn, reportFn, moduleLabel } = await resolver();

      // Run check + generate report
      checkFn(inputData);
      const report = reportFn(inputData);

      // Generate PDF (CF-compatible, pdf-lib)
      let pdfBytes: Uint8Array | null = null;
      try {
        const { generateReportPdf } = await import("../../lib/pdf");
        pdfBytes = await generateReportPdf({
          reportId,
          module: moduleLabel,
          generatedAt: new Date().toISOString().split("T")[0],
          productInfo: {
            name: inputData.productName,
            category: inputData.category,
            hsCode: inputData.hsCode,
            originCountry: inputData.originCountry,
          },
          result: report.result || {
            requiresRegistration: false,
            isHighRisk: false,
            riskCategory: "",
            summary: "Compliance assessment completed.",
            requiredDocuments: [],
          },
          nextSteps: report.nextSteps || [],
        });
      } catch (pdfErr) {
        console.error("PDF generation in webhook failed:", pdfErr);
      }

      // Upload PDF to R2
      let pdfPath = "";
      if (pdfBytes && env.R2) {
        try {
          const key = `reports/${reportId}.pdf`;
          await env.R2.put(key, pdfBytes, {
            httpMetadata: { contentType: "application/pdf" },
          });
          pdfPath = key;
        } catch (r2Err) {
          console.error("R2 upload failed:", r2Err);
        }
      }

      // Send email with PDF
      if (email && env.RESEND_API_KEY) {
        try {
          const reportUrl = `https://sinotradecompliance.com/${locale}/c/report/?id=${reportId}`;

          const attachments = pdfBytes
            ? [
                {
                  filename: `compliance-report-${reportId}.pdf`,
                  content: bufferToBase64(pdfBytes),
                  content_type: "application/pdf" as const,
                },
              ]
            : [];

          const emailRes = await fetch("https://api.resend.com/email", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: env.EMAIL_FROM || "send@sinotradecompliance.com",
              to: email,
              subject: `Your Compliance Report — ${moduleLabel} — SinoTrade Compliance`,
              html: buildWebhookEmailHtml({
                productName: inputData.productName || "your product",
                reportId,
                reportUrl,
                module: moduleLabel,
              }),
              attachments,
            }),
          });

          if (emailRes.ok) {
            console.log(`Email sent to ${email} for report ${reportId}`);
            meta._emailSent = 'true';
          } else {
            console.error(`Email failed: ${await emailRes.text()}`);
          }
        } catch (emailErr) {
          console.error("Email send failed:", emailErr);
        }
      }

      // Save/update report in D1
      if (env.DB) {
        try {
          // Check if report exists
          const existing = await env.DB.prepare(
            "SELECT id FROM reports WHERE id = ?"
          ).bind(reportId).first();

          if (existing) {
            await env.DB.prepare(
              `UPDATE reports SET
                result_data = ?,
                pdf_path = ?,
                payment_status = 'completed',
                user_email = COALESCE(NULLIF(?, ''), user_email)
              WHERE id = ?`
            )
              .bind(JSON.stringify(report), pdfPath, email, reportId)
              .run();
          } else {
            await env.DB.prepare(
              `INSERT INTO reports (id, module, product_name, hs_code, origin_country,
                input_data, result_data, user_email, payment_status, pdf_path, locale)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)`
            )
              .bind(
                reportId,
                moduleKey,
                inputData.productName,
                inputData.hsCode,
                inputData.originCountry,
                JSON.stringify(inputData),
                JSON.stringify(report),
                email,
                pdfPath,
                locale
              )
              .run();
          }
          console.log(`D1 saved report ${reportId}`);
        } catch (dbErr) {
          console.error("D1 save failed:", dbErr);
        }
      }
    } catch (reportErr) {
      console.error(`Report generation for ${moduleKey} failed:`, reportErr);
    }
  } else {
    console.warn(`Unknown module: ${moduleKey}, sending basic email only`);
  }

  // Fallback: always send basic confirmation email even if generation fails
  if (email && env.RESEND_API_KEY && !meta._emailSent) {
    try {
      const reportUrl = `https://sinotradecompliance.com/${locale}/c/report/?id=${reportId}`;
      const moduleLabel = getModuleLabel(moduleKey);

      const emailRes = await fetch("https://api.resend.com/email", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM || "send@sinotradecompliance.com",
          to: email,
          subject: `Your Compliance Report — ${moduleLabel} — SinoTrade Compliance`,
          html: buildWebhookEmailHtml({
            productName: (data.metadata as any)?.productName || "your product",
            reportId,
            reportUrl,
            module: moduleLabel,
          }),
        }),
      });

      if (emailRes.ok) {
        console.log(`Fallback email sent to ${email} for report ${reportId}`);
      }
    } catch (emailErr) {
      console.error("Fallback email failed:", emailErr);
    }
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────

function getModuleLabel(module: string): string {
  const labels: Record<string, string> = {
    gacc: "GACC Food Registration",
    label: "Chinese Label Compliance",
    ccc: "CCC Certification",
    nmpa: "Cosmetics Filing (NMPA)",
    crossborder: "Cross-Border E-commerce",
    trademark: "Brand Protection",
  };
  return labels[module] ?? "Compliance Report";
}

function buildWebhookEmailHtml(params: {
  productName: string;
  reportId: string;
  reportUrl: string;
  module: string;
}) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin:0 auto; padding:20px;">
  <div style="background:#1B365D; color:#fff; padding:24px; border-radius:8px 8px 0 0; text-align:center;">
    <h1 style="margin:0; font-size:20px;">Your Compliance Report</h1>
    <p style="margin:8px 0 0; opacity:0.8;">${params.module}</p>
  </div>
  <div style="background:#fff; border:1px solid #e5e7eb; padding:24px; border-radius:0 0 8px 8px;">
    <p>Hi,</p>
    <p>Your compliance report for <strong>${params.productName}</strong> is ready.</p>
    <p>Report ID: <strong>${params.reportId}</strong></p>
    <p style="font-size:12px; color:#666;">A PDF copy is attached to this email.</p>
    <div style="text-align:center; margin:24px 0;">
      <a href="${params.reportUrl}" style="display:inline-block; background:#D4AF37; color:#1B365D; text-decoration:none; padding:12px 32px; border-radius:6px; font-weight:bold; font-size:14px;">View Full Report Online</a>
    </div>
    <hr style="border:none; border-top:1px solid #eee; margin:20px 0;">
    <p style="font-size:12px; color:#999; text-align:center;">SinoTrade Compliance<br>david@sinotradecompliance.com | sinotradecompliance.com</p>
  </div>
</body></html>`;
}

function bufferToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
