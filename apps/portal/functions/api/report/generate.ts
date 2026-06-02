/**
 * Report generation — delegates to generate-pdf + send-email.
 *
 * POST /api/report/generate
 * Body: { reportId, email?, module, inputData, locale? }
 *
 * This endpoint exists for backward compatibility (webhook calls it).
 * It calls:
 *   1. /api/report/generate-pdf — generate PDF, upload to R2, update D1
 *   2. /api/report/send-email (if email provided) — send email with PDF
 */

export async function onRequest(context: {
  request: Request;
  env: any;
}): Promise<Response> {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { reportId, email, module: moduleKey, inputData, locale } =
      await context.request.json();

    if (!reportId || !moduleKey || !inputData) {
      return Response.json(
        { error: "Missing required fields: reportId, module, inputData" },
        { status: 400 }
      );
    }

    // ── 1. Generate PDF ──────────────────────────────────────────
    const baseUrl = context.request.url.substring(
      0, context.request.url.lastIndexOf("/")
    );

    const pdfRes = await fetch(`${baseUrl}/generate-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, module: moduleKey, inputData }),
    });

    const pdfResult = await pdfRes.json();
    if (!pdfRes.ok) {
      return Response.json(
        { error: "PDF generation failed", detail: pdfResult.error },
        { status: 502 }
      );
    }

    let emailResult: Record<string, any> = { emailSent: false };

    // ── 2. Send email (if email provided) ─────────────────────────
    if (email) {
      const emailRes = await fetch(`${baseUrl}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          email,
          module: moduleKey,
          inputData,
          locale: locale ?? "en",
        }),
      });
      emailResult = await emailRes.json();
    }

    return Response.json({
      ok: true,
      reportId,
      pdfGenerated: pdfResult.pdfGenerated,
      pdfPath: pdfResult.pdfPath,
      emailSent: emailResult.emailSent ?? false,
    });
  } catch (err) {
    console.error("generate error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
