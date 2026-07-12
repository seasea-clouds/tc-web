/**
 * Scheduled Pages Function — hourly CF Analytics → D1 backfill.
 *
 * Auto-deploys with the admin Pages project (git push → CF Pages build → deploy).
 * Environment variables configured in CF Pages Dashboard:
 *   - CLOUDFLARE_API_TOKEN
 *   - CLOUDFLARE_ZONE_ID
 * Last updated: 2026-07-12 15:16 CST
 */

import { ensureDailyCFCache, ensureHourlyCFCache } from "./lib/d1-cache";
import { hasConfig } from "./lib/cf-analytics";

interface Env {
  DB: any;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ZONE_ID?: string;
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { env } = context;
  console.log("[analytics-cron] started");

  if (!hasConfig(env)) {
    console.error(
      "[analytics-cron] CF Analytics not configured — set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID in Pages env",
    );
    return new Response("OK (no config)", { status: 200 });
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
  return new Response("OK", { status: 200 });
}

export const config = {
  schedule: "0 * * * *",
};
