/**
 * Generate PDF for a compliance report.
 *
 * POST /api/report/generate-pdf
 * Body: { reportId, module, inputData }
 *
 * Does ONE thing:
 *   1. Run rules check + generate report data
 *   2. Generate PDF (pdf-lib)
 *   3. Upload PDF to R2
 *   4. Update D1 record with result_data, pdf_path, payment_status
 *
 * Does NOT send email (use /api/report/send-email for that).
 */

import { runModule } from "../../lib/report-common";

interface Env {
  DB: any; // D1Database
  R2?: any; // R2Bucket
}

export async function onRequest(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { reportId, module: moduleKey, inputData } = await context.request.json();

    if (!reportId || !moduleKey || !inputData) {
      return Response.json(
        { error: "Missing required fields: reportId, module, inputData" },
        { status: 400 }
      );
    }

    // ── 1. Run rules + generate report data ──────────────────────────
    const { moduleLabel, result, nextSteps } = await runModule(moduleKey, inputData);

    // ── 2. Generate PDF ──────────────────────────────────────────────
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
        result,
        nextSteps,
      });
    } catch (pdfErr) {
      console.error("PDF generation failed:", pdfErr);
    }

    // ── 3. Upload PDF to R2 ──────────────────────────────────────────
    let pdfPath = "";
    if (pdfBytes && context.env.R2) {
      try {
        const key = `reports/${reportId}.pdf`;
        await context.env.R2.put(key, pdfBytes, {
          httpMetadata: { contentType: "application/pdf" },
        });
        pdfPath = key;
      } catch (r2Err) {
        console.error("R2 upload failed:", r2Err);
      }
    }

    // ── 4. Update D1 ────────────────────────────────────────────────
    if (context.env.DB) {
      try {
        const existing = await context.env.DB.prepare(
          "SELECT id FROM reports WHERE id = ?"
        ).bind(reportId).first();

        if (existing) {
          await context.env.DB.prepare(
            `UPDATE reports SET
              result_data = ?,
              pdf_path = ?,
              payment_status = 'completed'
            WHERE id = ?`
          )
            .bind(
              JSON.stringify({ result, nextSteps }),
              pdfPath,
              reportId
            )
            .run();
        } else {
          await context.env.DB.prepare(
            `INSERT INTO reports
              (id, module, product_name, hs_code, origin_country,
               input_data, result_data, pdf_path, payment_status, locale)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`
          )
            .bind(
              reportId,
              moduleKey,
              inputData.productName ?? "",
              inputData.hsCode ?? "",
              inputData.originCountry ?? "",
              JSON.stringify(inputData),
              JSON.stringify({ result, nextSteps }),
              pdfPath,
              inputData.locale ?? "en"
            )
            .run();
        }
      } catch (dbErr) {
        console.error("D1 save failed:", dbErr);
      }
    }

    return Response.json({
      ok: true,
      reportId,
      moduleLabel,
      pdfGenerated: !!pdfBytes,
      pdfPath,
    });
  } catch (err) {
    console.error("generate-pdf error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
