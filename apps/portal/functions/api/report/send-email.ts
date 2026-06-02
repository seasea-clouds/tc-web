/**
 * Send compliance report email with PDF attachment.
 *
 * POST /api/report/send-email
 * Body: { reportId, email, module, inputData, locale? }
 *
 * Does ONE thing:
 *   1. Look up report from D1
 *   2. Fetch PDF from R2 (or regenerate)
 *   3. Build and send email via Resend with PDF attachment
 *
 * Does NOT generate PDF (use /api/report/generate-pdf for that).
 */

import { runModule, buildEmailHtml, bufferToBase64 } from "../../lib/report-common";

interface Env {
  DB: any; // D1Database
  R2?: any; // R2Bucket
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
}

export async function onRequest(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { reportId, email, module: moduleKey, inputData, locale } =
      await context.request.json();

    if (!reportId || !email) {
      return Response.json(
        { error: "Missing required fields: reportId, email" },
        { status: 400 }
      );
    }

    if (!context.env.RESEND_API_KEY) {
      return Response.json(
        { error: "RESEND_API_KEY not configured" },
        { status: 500 }
      );
    }

    // ── 1. Get module label ─────────────────────────────────────────
    const mod = moduleKey?.toLowerCase() ?? "";
    let moduleLabel = "Compliance Report";
    let productName = inputData?.productName ?? "your product";
    let pdfBytes: Uint8Array | null = null;

    // Try fetching from D1 / regenerating
    if (mod && inputData) {
      try {
        const { moduleLabel: ml } = await runModule(mod, inputData);
        moduleLabel = ml;
      } catch {}
    }

    // ── 2. Fetch PDF from R2 (preferred) ────────────────────────────
    if (context.env.R2) {
      try {
        const obj = await context.env.R2.get(`reports/${reportId}.pdf`);
        if (obj) {
          const ab = await obj.arrayBuffer();
          pdfBytes = new Uint8Array(ab);
        }
      } catch (r2Err) {
        console.error("R2 fetch failed, will try to regenerate:", r2Err);
      }
    }

    // Fallback: regenerate PDF from D1 data
    if (!pdfBytes && context.env.DB) {
      try {
        const row = await context.env.DB.prepare(
          "SELECT module, input_data FROM reports WHERE id = ?"
        ).bind(reportId).first() as any;

        if (row) {
          const storedInput = row.input_data ? JSON.parse(row.input_data) : inputData;
          const storedMod = row.module ?? mod;

          const { moduleLabel: ml, result, nextSteps } = await runModule(
            storedMod, storedInput
          );
          moduleLabel = ml;
          productName = storedInput.productName ?? productName;

          const { generateReportPdf } = await import("../../lib/pdf");
          pdfBytes = await generateReportPdf({
            reportId,
            module: moduleLabel,
            generatedAt: new Date().toISOString().split("T")[0],
            productInfo: {
              name: storedInput.productName ?? "",
              category: storedInput.category ?? "",
              hsCode: storedInput.hsCode,
              originCountry: storedInput.originCountry ?? "",
            },
            result,
            nextSteps,
          });
        }
      } catch (dbErr) {
        console.error("PDF regeneration from D1 failed:", dbErr);
      }
    }

    // ── 3. Build and send email ─────────────────────────────────────
    const reportUrl = `https://sinotradecompliance.com/${locale ?? "en"}/c/report/?id=${reportId}`;

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
        Authorization: `Bearer ${context.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: context.env.EMAIL_FROM || "send@sinotradecompliance.com",
        to: email,
        subject: `Your Compliance Report — ${moduleLabel} — SinoTrade Compliance`,
        html: buildEmailHtml({
          productName,
          reportId,
          reportUrl,
          module: moduleLabel,
        }),
        attachments,
      }),
    });

    const emailSent = emailRes.ok;
    if (!emailSent) {
      const errText = await emailRes.text();
      console.error(`Email send failed for ${reportId}: ${errText}`);
    }

    return Response.json({
      ok: emailSent,
      reportId,
      emailSent,
      pdfAttached: !!pdfBytes,
    });
  } catch (err) {
    console.error("send-email error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
