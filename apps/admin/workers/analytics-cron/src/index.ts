import { ensureDailyCFCache, ensureHourlyCFCache } from "../../../functions/lib/d1-cache";
import { hasConfig } from "../../../functions/lib/cf-analytics";

interface Env {
  DB: any;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ZONE_ID?: string;
}

export default {
  async scheduled(_controller: any, env: Env, _ctx: any) {
    console.log("[analytics-cron] started");

    if (!hasConfig(env)) {
      console.error(
        "[analytics-cron] CF Analytics not configured — set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID in Worker env"
      );
      return;
    }

    // Step 1: Daily backfill — fill missing historical dates from CF → D1
    const dailyResult = await ensureDailyCFCache(env);
    if (dailyResult) {
      console.error("[analytics-cron] daily backfill error:", dailyResult);
    } else {
      console.log("[analytics-cron] daily backfill OK");
    }

    // Step 2: Hourly backfill — fill today's completed hours from CF → D1
    try {
      await ensureHourlyCFCache(env);
      console.log("[analytics-cron] hourly backfill OK");
    } catch (err: any) {
      console.error("[analytics-cron] hourly backfill error:", err);
    }

    console.log("[analytics-cron] completed");
  },
};
