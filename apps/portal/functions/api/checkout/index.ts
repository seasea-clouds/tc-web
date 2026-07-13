/**
 * Creem Checkout API
 *
 * Creates a checkout session and returns the payment URL.
 * Frontend calls this when user clicks "Get Report — $1"
 *
 * POST /api/checkout
 * Body: { productId?, reportId, email?, locale?, metadata }
 */

interface Env {
  CREEM_API_KEY: string;
  CREEM_PRODUCT_ID_SINGLE: string;
  CREEM_PRODUCT_ID_SUBSCRIBE: string;
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
    const { productId, reportId, email, locale, metadata } = await context.request.json();

    if (!reportId) {
      return Response.json({ error: "Missing reportId" }, { status: 400 });
    }

    const pid = productId ?? context.env.CREEM_PRODUCT_ID_SINGLE;
    const loc = locale ?? "en";

    // ── Build Creem checkout session ──────────────────────────────
    const body: Record<string, unknown> = {
      product_id: pid,
      success_url: `https://sinotradecompliance.com/${loc}/c/report/?id=${reportId}`,
      metadata: {
        report_id: reportId,
        locale: loc,
        ...(email && { email }),
        ...(metadata ?? {}),
      },
    };

    const res = await fetch("https://test-api.creem.io/v1/checkouts", {
      method: "POST",
      headers: {
        "x-api-key": context.env.CREEM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Creem checkout failed:", err);
      return Response.json({ error: "Checkout creation failed" }, { status: 502 });
    }

    const data = await res.json();

    return Response.json({
      checkoutUrl: data.checkout_url,
      sessionId: data.id,
    });
  } catch (err) {
    console.error("Checkout error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
