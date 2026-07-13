/**
 * Debug endpoint to test Creem API connectivity from Pages Functions.
 * GET /api/debug/creem-test
 */
interface Env {
  CREEM_API_KEY: ***
  CREEM_PRODUCT_ID_SINGLE: string;
}

export async function onRequest(context: {
  request: Request;
  env: Env;
}) {
  try {
    // Test 1: Creem API call with minimal payload
    const body = {
      product_id: context.env.CREEM_PRODUCT_ID_SINGLE || "prod_6Id7hR6aFrTWo8QU8I3R30",
      success_url: "https://example.com",
    };

    const creemRes = await fetch("https://test-api.creem.io/v1/checkouts", {
      method: "POST",
      headers: {
        "x-api-key": context.env.CREEM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const creemText = await creemRes.text();
    let creemJson = null;
    try { creemJson = JSON.parse(creemText); } catch {}

    return Response.json({
      envVars: {
        CREEM_PRODUCT_ID_SINGLE: context.env.CREEM_PRODUCT_ID_SINGLE || "(not set)",
        CREEM_API_KEY_LENGTH: (context.env.CREEM_API_KEY || "").length,
        CREEM_API_KEY_FIRST_10: (context.env.CREEM_API_KEY || "").substring(0, 10) + "...",
      },
      creem: {
        status: creemRes.status,
        statusText: creemRes.statusText,
        body: creemJson,
      },
    });
  } catch (err) {
    return Response.json({
      error: String(err),
      stack: (err as Error).stack,
    }, { status: 500 });
  }
}
