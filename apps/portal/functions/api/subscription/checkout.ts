/**
 * Creem Subscription Checkout API
 *
 * Creates a monthly subscription checkout session.
 * Frontend calls this when user clicks "Subscribe $9.9/mo"
 *
 * POST /api/subscription/checkout
 * Body: { locale? }
 * Requires authenticated user session
 */

import { getSessionId, verifySession } from '../../lib/session';

interface Env {
  CREEM_API_KEY: string;
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
    // ── Verify user session ─────────────────────────────────────
    const sessionId = getSessionId(context.request);
    if (!sessionId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await verifySession(context.env.DB, sessionId);
    if (!user) {
      return Response.json({ error: "Session expired" }, { status: 401 });
    }

    const { locale } = await context.request.json();
    const loc = locale ?? "en";

    // ── Build Creem subscription checkout session ─────────────────
    // Use the same checkout endpoint format as the existing single-report checkout.
    // Creem creates both one-time and subscription checkout sessions via /v1/checkouts.
    const body = {
      product_id: context.env.CREEM_PRODUCT_ID_SUBSCRIBE,
      success_url: `https://sinotradecompliance.com/${loc}/c/me/subscription/`,
      metadata: {
        user_id: user.userId,
        email: user.email,
        locale: loc,
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
      console.error("Creem subscription checkout failed:", err);
      return Response.json({ error: "Subscription checkout failed" }, { status: 502 });
    }

    const data = await res.json();

    return Response.json({
      checkoutUrl: data.checkout_url,
      sessionId: data.id,
    });
  } catch (err) {
    console.error("Subscription checkout error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
