/**
 * Analytics Cron — standalone Worker that syncs CF Analytics → D1 hourly.
 *
 * Deployed with: npx wrangler deploy
 * 
 * This is a WORKER, not a Pages Function, so the cron trigger is always
 * properly registered by wrangler.
 */

import { ensureDailyCFCache, ensureHourlyCFCache } from "../../../functions/lib/d1-cache";
import { hasConfig } from "../../../functions/lib/cf-analytics";

interface Env {
  DB: any;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ZONE_ID?: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log("[analytics-cron] started");

    if (!hasConfig(env)) {
      console.error(
        "[analytics-cron] CF Analytics not configured — set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID",
      );
      return;
    }

    // Step 1: Daily backfill
    const dailyResult = await ensureDailyCFCache(env);
    if (dailyResult) {
      console.error("[analytics-cron] daily backfill error:", dailyResult);
    } else {
      console.log("[analytics-cron] daily backfill OK");
    }

    // Step 2: Hourly backfill
    try {
      await ensureHourlyCFCache(env);
      console.log("[analytics-cron] hourly backfill OK");
    } catch (err: any) {
      console.error("[analytics-cron] hourly backfill error:", err);
    }

    console.log("[analytics-cron] completed");
  },
};
