/**
 * Debug Creem Connectivity
 *
 * Tests the Creem API from the Cloudflare Pages network.
 * Useful for diagnosing API key and connectivity issues.
 *
 * GET /api/debug-creem
 */

interface Env {
  CREEM_API_KEY: string;
  CREEM_PRODUCT_ID_SINGLE: string;
  CREEM_PRODUCT_ID_SUBSCRIBE: string;
  CREEM_WEBHOOK_SECRET: string;
}

export async function onRequest(context: { request: Request; env: Env }) {
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      hasApiKey: !!context.env.CREEM_API_KEY,
      hasWebhookSecret: !!context.env.CREEM_WEBHOOK_SECRET,
      hasProductSingle: !!context.env.CREEM_PRODUCT_ID_SINGLE,
      hasProductSubscribe: !!context.env.CREEM_PRODUCT_ID_SUBSCRIBE,
      apiKeyPrefix: context.env.CREEM_API_KEY
        ? context.env.CREEM_API_KEY.substring(0, 12) + "..."
        : "(none)",
      apiKeyLength: context.env.CREEM_API_KEY
        ? context.env.CREEM_API_KEY.length
        : 0,
    },
  };

  // Test Creem API connectivity
  try {
    const res = await fetch("https://test-api.creem.io/v1/checkouts", {
      method: "POST",
      headers: {
        "x-api-key": context.env.CREEM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: context.env.CREEM_PRODUCT_ID_SINGLE,
        success_url: "https://example.com",
        metadata: { test: true, source: "debug-creem" },
      }),
    });

    result.creemTest = {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
    };

    if (res.ok) {
      const data = await res.json();
      result.creemTest.data = data;
    } else {
      const text = await res.text();
      result.creemTest.error = text.substring(0, 500);
    }
  } catch (err) {
    result.creemTest = {
      status: 0,
      ok: false,
      error: String(err),
    };
  }

  return Response.json(result, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
// redeploy: creem api key updated july 2
