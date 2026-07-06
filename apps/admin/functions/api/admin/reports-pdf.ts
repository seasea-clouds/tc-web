/**
 * Admin PDF download endpoint
 * GET /api/admin/reports-pdf?id=xxx
 *
 * Generates PDF on-the-fly from stored report data (no R2 needed).
 * Reads result_data + input_data from D1, generates PDF via pdf-lib,
 * returns as downloadable file.
 */

import { requireAdmin } from "../../lib/admin-session";
import { generateReportPdf } from "../../lib/pdf";

interface Env {
  DB: any;
}

export async function onRequest(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  try {
    await requireAdmin(context.request, context.env);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (context.request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(context.request.url);
  const reportId = url.searchParams.get("id");
  if (!reportId) {
    return Response.json({ error: "Missing report ID" }, { status: 400 });
  }

  try {
    // ── Read report from D1 ──
    const row: any = await context.env.DB.prepare(
      `SELECT id, module, product_name, hs_code, origin_country, input_data, result_data, locale, created_at
       FROM reports WHERE id = ?`
    ).bind(reportId).first();

    if (!row) {
      return Response.json({ error: "Report not found" }, { status: 404 });
    }

    // ── Parse stored data ──
    const inputData = row.input_data ? JSON.parse(row.input_data) : {};
    const resultData = row.result_data ? JSON.parse(row.result_data) : {};

    // result_data stores { result, nextSteps }
    const result = resultData.result || {};
    const nextSteps = resultData.nextSteps || [];

    // Map module code to label
    const moduleLabels: Record<string, string> = {
      gacc: "GACC Food Registration",
      label: "Chinese Label Compliance",
      ccc: "CCC Certification",
      nmpa: "NMPA Cosmetics Registration",
      crossborder: "Cross-Border E-Commerce",
      trademark: "Trademark Registration (China)",
    };

    // ── Generate PDF ──
    const pdfBytes = await generateReportPdf({
      reportId: row.id,
      module: moduleLabels[row.module] || row.module,
      generatedAt: (row.created_at || "").split("T")[0],
      productInfo: {
        name: row.product_name || inputData.productName || "",
        category: inputData.category || "",
        hsCode: row.hs_code || inputData.hsCode,
        originCountry: row.origin_country || inputData.originCountry || "",
      },
      result: {
        requiresRegistration: result.requiresRegistration,
        isHighRisk: result.isHighRisk,
        riskCategory: result.riskCategory,
        summary: result.summary,
        requiredDocuments: result.requiredDocuments,
      },
      nextSteps,
    });

    // ── Return PDF as downloadable response ──
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${reportId}.pdf"`,
        "Content-Length": String(pdfBytes.byteLength),
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    console.error("PDF generation error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
