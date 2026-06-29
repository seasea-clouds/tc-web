/**
 * Debug: Test Creem API connectivity from within CF Pages Functions network
 */
export async function onRequest(context: { request: Request; env: Record<string, string> }) {
  const key = context.env.CREEM_API_KEY || "NOT_SET";
  const keyPrefix = key.substring(0, 12) + "..." || "EMPTY";
  
  try {
    const res = await fetch("https://test-api.creem.io/v1/checkouts", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: context.env.CREEM_PRODUCT_ID_SINGLE || "prod_6Id7hR6aFrTWo8QU8I3R30",
        success_url: "https://example.com/success",
      }),
    });

    const body = await res.text();
    
    return Response.json({
      status: res.status,
      keyPrefix,
      productIdSingle: context.env.CREEM_PRODUCT_ID_SINGLE,
      productIdSub: context.env.CREEM_PRODUCT_ID_SUBSCRIBE,
      responseBody: body.substring(0, 500),
      commitFile: "debug-creem.ts - commit a151c38",
    });
  } catch (err) {
    return Response.json({
      error: String(err),
      keyPrefix,
    });
  }
}
