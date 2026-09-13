/**
 * Generate PDF for a compliance report.
 *
 * POST /api/report/generate-pdf
 * Body: { reportId, module, inputData }
 *
 * Does ONE thing:
 *   1. Run rules check + generate report data
 *   2. Generate PDF (pdf-lib)
 *   3. 更新 D1（免费自查写 payment_status='free_campaign'，不覆盖已有付费状态）
 *   4. 返回 guest_token（报告访问令牌）
 *
 * 注意：账户未开通 R2（错误码 10042），R2 上传/读取代码已移除（2026-09-13）；
 * PDF 由前端下载接口/邮件附件实时生成，不落对象存储。
 *
 * Does NOT send email (use /api/report/send-email for that).
 */

import { runModule } from "../../lib/report-common";
import { ensureGuestToken } from "../../lib/report-access";

interface Env {
  DB: any; // D1Database
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

    // ── 3. 写 D1（已移除 R2 上传）─────────────────────────────────
    const pdfPath = "";

    // ── 4. Update D1 ────────────────────────────────────────────────
    if (context.env.DB) {
      try {
        const existing = await context.env.DB.prepare(
          "SELECT id FROM reports WHERE id = ?"
        ).bind(reportId).first();

        if (existing) {
          // 注意：不触碰 payment_status —— 付费报告不能被免费自查流程改写
          await context.env.DB.prepare(
            `UPDATE reports SET
              result_data = ?,
              pdf_path = ?
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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'free_campaign', ?)`
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
      guestToken: context.env.DB ? await ensureGuestToken(context.env.DB, reportId) : "",
    });
  } catch (err) {
    console.error("generate-pdf error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
