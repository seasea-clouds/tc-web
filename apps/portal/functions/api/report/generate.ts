/**
 * Report generation API
 *
 * Triggered after payment success via webhook or client-side callback.
 * Generates PDF, sends email, and updates D1 record.
 *
 * POST /api/report/generate
 * Body: { reportId, email?, module, inputData }
 */

// Module resolver map — maps module key to its check function + report generator
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

interface Env {
  DB: any; // D1Database
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  R2?: any; // R2Bucket
}

export async function onRequest(context: {
  request: Request;
  env: Env;
  params: Record<string, string>;
}) {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { reportId, email, module: moduleKey, inputData } = await context.request.json();

    if (!reportId || !moduleKey || !inputData) {
      return Response.json({ error: "Missing required fields: reportId, module, inputData" }, { status: 400 });
    }

    const mod = moduleKey.toLowerCase();
    const resolver = MODULE_RESOLVERS[mod];
    if (!resolver) {
      return Response.json({ error: `Unknown module: ${moduleKey}` }, { status: 400 });
    }

    // Resolve module dynamically (ESM-safe)
    const { checkFn, reportFn, moduleLabel } = await resolver();

    // 1. Run rules check
    checkFn(inputData);

    // 2. Generate report data
    const report = reportFn({
      category: inputData.category,
      originCountry: inputData.originCountry,
      productName: inputData.productName,
      hsCode: inputData.hsCode,
    });

    // 3. Generate PDF (using pdf-lib, CF-compatible)
    let pdfBytes: Uint8Array | null = null;
    try {
      const { generateReportPdf } = await import("../../lib/pdf");
      pdfBytes = await generateReportPdf({
        reportId,
        module: moduleLabel,
        generatedAt: new Date().toISOString().split("T")[0],
        productInfo: {
          name: inputData.productName ?? "",
          category: inputData.category ?? "",
          hsCode: inputData.hsCode,
          originCountry: inputData.originCountry ?? "",
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
      console.error("PDF generation failed (non-fatal):", pdfErr);
      // PDF failure is non-fatal — user can still view web report
    }

    // 4. Upload PDF to R2 (if available)
    let pdfPath = "";
    if (pdfBytes && context.env.R2) {
      try {
        const key = `reports/${reportId}.pdf`;
        await context.env.R2.put(key, pdfBytes, {
          httpMetadata: { contentType: "application/pdf" },
        });
        pdfPath = key;
      } catch (r2Err) {
        console.error("R2 upload failed (non-fatal):", r2Err);
      }
    }

    // 5. Send email (if email provided)
    let emailSent = false;
    if (email && pdfBytes) {
      try {
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
              productName: inputData.productName ?? "your product",
              reportId,
              reportUrl: `https://sinotradecompliance.com/en/c/report/?id=${reportId}`,
              module: moduleLabel,
            }),
            attachments: [
              {
                filename: `compliance-report-${reportId}.pdf`,
                content: bufferToBase64(pdfBytes),
                content_type: "application/pdf",
              },
            ],
          }),
        });
        emailSent = emailRes.ok;
        if (!emailRes.ok) {
          console.error(`Email failed: ${await emailRes.text()}`);
        }
      } catch (emailErr) {
        console.error("Email send failed (non-fatal):", emailErr);
      }
    }

    // 6. Save to D1
    if (context.env.DB) {
      try {
        await context.env.DB.prepare(
          `UPDATE reports SET
            result_data = ?,
            pdf_path = ?,
            payment_status = 'completed'
          WHERE id = ?`
        )
          .bind(JSON.stringify(report), pdfPath, reportId)
          .run();
      } catch (dbErr) {
        console.error("D1 save failed:", dbErr);
      }
    }

    return Response.json({
      ok: true,
      reportId,
      pdfGenerated: !!pdfBytes,
      emailSent,
    });
  } catch (err) {
    console.error("Report generation error:", err);
    return new Response(
      JSON.stringify({ error: "Generation failed", detail: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────

function buildEmailHtml(params: {
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
  // CF workerd: btoa with byte array
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
