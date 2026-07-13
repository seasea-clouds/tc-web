/**
 * Creem Checkout API
 *
 * Creates a checkout session and returns the payment URL.
 * Frontend calls this when user clicks "Get Report -- $1"
 *
 * POST /api/checkout
 * Body: { productId?, reportId, email?, locale?, metadata }
 *
 * DEBUG: returns actual Creem API error for troubleshooting.
 */

interface Env {
  CREEM_API_KEY: string;
  CREEM_PRODUCT_ID_SINGLE: string;
  CREEM_PRODUCT_ID_SUBSCRIBE: string;
  DB: any;
}

export async function onRequest(context: {
  request: Request;
  env: Env;
}) {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { productId, reportId, email, locale, metadata } = await context.request.json();

    if (!reportId) {
      return Response.json({ error: "Missing reportId" }, { status: 400 });
    }

    const pid = productId ?? context.env.CREEM_PRODUCT_ID_SINGLE;
    const loc = locale ?? "en";

    const body = {
      product_id: pid,
      success_url: "https://sinotradecompliance.com/" + loc + "/c/report/?id=" + reportId,
      metadata: {
        report_id: reportId,
        locale: loc,
        ...(email && { email }),
        ...(metadata ?? {}),
      },
    };

    const creemRes = await fetch("https://test-api.creem.io/v1/checkouts", {
      method: "POST",
      headers: {
        "x-api-key": context.env.CREEM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const status = creemRes.status;
    const statusText = creemRes.statusText;
    const bodyText = await creemRes.text();

    return Response.json({
      debug: true,
      creemStatus: status,
      creemStatusText: statusText,
      creemBody: bodyText,
    }, { status: 200 });

  } catch (err) {
    return Response.json({
      debug: true,
      error: String(err),
      stack: (err as Error).stack,
    }, { status: 500 });
  }
}
