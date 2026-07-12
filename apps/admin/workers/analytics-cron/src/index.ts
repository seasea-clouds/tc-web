/**
 * Analytics Cron — standalone Worker that syncs CF Analytics → D1 hourly.
 *
 * Deployed with: npx wrangler deploy
 *
 * This is a WORKER, not a Pages Function, so the cron trigger is always
 * properly registered by wrangler.
 *
 * Supports manual trigger via HTTP GET. The handler returns sync status
 * for debugging. Optionally set CRON_SECRET secret for auth protection.
 */

import { ensureDailyCFCache, ensureHourlyCFCache } from "../../../functions/lib/d1-cache";
import { hasConfig } from "../../../functions/lib/cf-analytics";

interface Env {
  DB: any;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ZONE_ID?: string;
  /** Secret key for manual HTTP trigger (optional) */
  CRON_SECRET?: string;
}

async function runAnalyticsSync(env: Env): Promise<{ ok: boolean; message: string }> {
  console.log("[analytics-cron] started");

  if (!hasConfig(env)) {
    const msg = "Analytics not configured — check CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID";
    console.error("[analytics-cron]", msg);
    return { ok: false, message: msg };
  }

  const dailyResult = await ensureDailyCFCache(env);
  if (dailyResult) {
    console.error("[analytics-cron] daily error:", dailyResult);
    return { ok: false, message: "daily: " + dailyResult };
  }

  try {
    await ensureHourlyCFCache(env);
  } catch (err: any) {
    const msg = "hourly: " + (err?.message || err);
    console.error("[analytics-cron]", msg);
    return { ok: false, message: msg };
  }

  return { ok: true, message: "sync completed" };
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const result = await runAnalyticsSync(env);
    console.log("[analytics-cron] result:", JSON.stringify(result));
  },

  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    // Optional auth check
    const expected = env.CRON_SECRET;
    const auth = request.headers.get("Authorization") || "";
    if (expected && auth !== `Bearer ${expected}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await runAnalyticsSync(env);
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 500,
      headers: { "Content-Type": "application/json" },
    });
  },
};
