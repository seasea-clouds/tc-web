/**
 * Page view tracking endpoint
 * POST /api/admin/track
 *
 * Fired asynchronously from site middleware to record page views.
 * Accepts page view data and writes to D1 page_views table.
 */

interface Env {
  DB: any;
}

export async function onRequest(context: { request: Request; env: Env }) {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { path, project, referrer, locale } = await context.request.json();

    const id = crypto.randomUUID();
    const country = context.request.headers.get("CF-IPCountry") || "";
    const userAgent = context.request.headers.get("User-Agent") || "";

    await context.env.DB.prepare(
      `INSERT INTO page_views (id, path, project, referrer, country, user_agent, locale)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, path || "/", project || "site", referrer || "", country, userAgent, locale || "")
      .run();

    return Response.json({ ok: true });
  } catch {
    // Silently fail — tracking is best-effort
    return Response.json({ ok: false });
  }
}
