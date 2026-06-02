/**
 * Save report to D1 (called before redirecting to payment/report)
 * POST /api/report/save
 * Body: { reportId, module, inputData, resultData, nextSteps, locale? }
 */

interface Env {
  DB: any; // D1Database
}

export async function onRequest(context: {
  request: Request;
  env: Env;
}) {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { reportId, module, inputData, resultData, nextSteps, locale } = await context.request.json();

    if (!reportId || !module || !resultData) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const reportMeta = {
      result: resultData,
      nextSteps: nextSteps || [],
    };

    let saved = false;
    if (context.env.DB) {
      const result = await context.env.DB.prepare(
        `INSERT OR REPLACE INTO reports (id, module, product_name, hs_code, origin_country, input_data, result_data, payment_status, locale, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'))`
      )
        .bind(
          reportId,
          module,
          inputData?.productName || '',
          inputData?.hsCode || '',
          inputData?.originCountry || '',
          JSON.stringify(inputData || {}),
          JSON.stringify(reportMeta),
          locale || 'en'
        )
        .run();
      saved = result?.success === true || result?.meta?.changes > 0;
    }

    console.log('Report save result:', { reportId, saved: saved || (context.env.DB ? 'hasDB' : 'noDB') });
    return Response.json({ ok: true, reportId, saved: !!context.env.DB && saved });
  } catch (err) {
    console.error("Report save error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
