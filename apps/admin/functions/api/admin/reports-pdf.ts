/**
 * Admin PDF download endpoint
 * GET /api/admin/reports/:id/pdf
 *
 * Fetches the report PDF from R2 and returns it as a downloadable file.
 * Requires the R2 bucket binding (name: R2) to be configured.
 */

import { requireAdmin } from "../../lib/admin-session";

interface Env {
  DB: any;
  R2?: any;
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
  const pathParts = url.pathname.split("/").filter(Boolean);
  // pathParts: ["api", "admin", "reports-pdf", ":id"]

  const reportId = pathParts[3];
  if (!reportId) {
    return Response.json({ error: "Missing report ID" }, { status: 400 });
  }

  try {
    // ── Look up pdf_path from D1 ──
    const row: any = await context.env.DB.prepare(
      "SELECT pdf_path FROM reports WHERE id = ?"
    ).bind(reportId).first();

    if (!row) {
      return Response.json({ error: "Report not found" }, { status: 404 });
    }

    const pdfPath = row.pdf_path || "";
    if (!pdfPath) {
      return Response.json({
        error: "No PDF available for this report",
        detail: "PDF has not been generated yet. This may be because R2 storage was configured after the report was created.",
      }, { status: 404 });
    }

    // ── Fetch PDF from R2 ──
    if (!context.env.R2) {
      return Response.json({
        error: "R2 storage not configured",
        detail: "The R2 bucket binding is missing. Add R2 binding to the Pages project.",
      }, { status: 500 });
    }

    const pdfObject = await context.env.R2.get(pdfPath);
    if (!pdfObject) {
      return Response.json({
        error: "PDF file not found in storage",
        detail: `The file at ${pdfPath} does not exist in the bucket.`,
      }, { status: 404 });
    }

    // ── Return PDF as downloadable response ──
    const pdfBytes = await pdfObject.arrayBuffer();
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${reportId}.pdf"`,
        "Content-Length": String(pdfBytes.byteLength),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: any) {
    console.error("PDF download error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
