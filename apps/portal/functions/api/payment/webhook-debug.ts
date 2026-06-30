/**
 * Debug endpoint: GET /api/payment/webhook-debug
 *
 * Returns recent webhook logs + subscription records from D1.
 * Used for debugging Creem webhook payloads.
 */

interface Env {
  DB: any; // D1Database
}

export async function onRequest(context: { request: Request; env: Env }) {
  try {
    const db = context.env.DB;

    if (!db) {
      return new Response(JSON.stringify({ error: "DB not configured" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Try to create the table (no-op if exists)
    try {
      await db.prepare(
        "CREATE TABLE IF NOT EXISTS webhook_logs (id INTEGER PRIMARY KEY, type TEXT, payload TEXT, metadata TEXT, created_at TEXT DEFAULT (datetime('now')))"
      ).run();
    } catch (tableErr) {
      // Table might already exist with different schema, that's fine
      console.error("webhook_logs table create error:", tableErr);
    }

    // Get webhook logs
    let logs: any[] = [];
    try {
      const result = await db.prepare(
        "SELECT id, type, metadata, payload, created_at FROM webhook_logs ORDER BY id DESC LIMIT 10"
      ).all();
      logs = (result?.results || []).map((log: any) => ({
        id: log.id,
        type: log.type,
        metadata: log.metadata,
        payload: log.payload ? log.payload.substring(0, 3000) : null,
        created_at: log.created_at,
      }));
    } catch (logErr) {
      console.error("Failed to get webhook logs:", logErr);
    }

    // Get recent subscriptions
    let subs: any[] = [];
    try {
      const result = await db.prepare(
        "SELECT id, user_id, plan, status, provider_subscription_id, current_period_start, current_period_end, created_at FROM subscriptions ORDER BY created_at DESC LIMIT 5"
      ).all();
      subs = result?.results || [];
    } catch (subErr) {
      console.error("Failed to get subscriptions:", subErr);
    }

    return new Response(JSON.stringify({
      webhook_logs: logs,
      recent_subscriptions: subs,
    }, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: String(err),
      message: "Debug endpoint error",
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
