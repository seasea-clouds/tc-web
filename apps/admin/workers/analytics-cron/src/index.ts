/**
 * Analytics Cron — standalone Worker that syncs CF Analytics → D1 hourly.
 *
 * Deployed with: npx wrangler deploy
 *
 * This is a WORKER, not a Pages Function, so the cron trigger is always
 * properly registered by wrangler.
 *
 * Supports manual trigger via HTTP GET:
 *   GET /sync       — trigger full analytics sync
 *   GET /health     — health check (no sync, just status)
 * Optionally set CRON_SECRET secret for auth protection.
 */

import { ensureDailyCFCache, ensureHourlyCFCache } from "../../../functions/lib/d1-cache";
import { hasConfig } from "../../../functions/lib/cf-analytics";
import { graphql } from "../../../functions/lib/cf-analytics";

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

async function healthCheck(env: Env): Promise<{ ok: boolean; message: string; details: any }> {
  const details: any = {};

  // 1. Config check
  details.hasToken = !!env.CLOUDFLARE_API_TOKEN;
  details.hasZoneId = !!env.CLOUDFLARE_ZONE_ID;
  details.hasDb = !!env.DB;

  if (!details.hasToken || !details.hasZoneId) {
    return { ok: false, message: "Missing configuration", details };
  }

  // 2. Test GraphQL token validity
  const token = env.CLOUDFLARE_API_TOKEN;
  const zoneId = env.CLOUDFLARE_ZONE_ID;
  if (token && zoneId) {
    const simpleQuery = `{
      viewer {
        zones(filter: {zoneTag: "${zoneId}"}) {
          zoneTag: zoneTag
        }
      }
    }`;

    try {
      const data = await graphql(simpleQuery, token);
      details.graphqlOk = !!(data?.viewer?.zones?.[0]?.zoneTag);
      details.zoneValid = true;
    } catch (err: any) {
      details.graphqlOk = false;
      details.graphqlError = (err?.message || String(err)).slice(0, 200);
    }
  } else {
    details.graphqlOk = false;
    details.zoneValid = false;
  }

  // 3. Check D1 last sync time
  if (env.DB) {
    try {
      const latestDaily: any = await env.DB.prepare(
        "SELECT date, total_pv, total_uv FROM daily_page_stats ORDER BY date DESC LIMIT 1"
      ).first();
      details.lastDailySync = latestDaily || null;

      const latestHourly: any = await env.DB.prepare(
        "SELECT date, hour, pv FROM hourly_page_stats ORDER BY date DESC, hour DESC LIMIT 1"
      ).first();
      details.lastHourlySync = latestHourly || null;

      const totalDaily = await env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM daily_page_stats"
      ).first();
      details.dailyRows = totalDaily?.cnt || 0;

      const totalHourly = await env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM hourly_page_stats"
      ).first();
      details.hourlyRows = totalHourly?.cnt || 0;
    } catch (err: any) {
      details.dbError = (err?.message || String(err)).slice(0, 200);
    }
  }

  const ok = details.graphqlOk && details.hasDb;
  return {
    ok,
    message: ok ? "healthy" : "unhealthy",
    details,
  };
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const result = await runAnalyticsSync(env);
    console.log("[analytics-cron] result:", JSON.stringify(result));

    // Log health diagnostics regardless of sync result
    const health = await healthCheck(env);
    if (!health.ok) {
      console.error("[analytics-cron] health check failed:", JSON.stringify(health.details));
    }
  },

  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    // Auth check (applied to all endpoints)
    const expected = env.CRON_SECRET;
    const auth = request.headers.get("Authorization") || "";
    if (expected && auth !== `Bearer ${expected}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(request.url);

    // Health check — no sync, just status
    if (url.pathname === "/health") {
      const result = await healthCheck(env);
      return new Response(JSON.stringify(result, null, 2), {
        status: result.ok ? 200 : 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Default: sync
    const result = await runAnalyticsSync(env);
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 500,
      headers: { "Content-Type": "application/json" },
    });
  },
};
