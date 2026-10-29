/**
 * tc-web-cron — 站点的**统一定时任务 Worker**。
 *
 * 所有定时任务都在这一个 Worker 里，按 cron 表达式分流（见 SCHEDULES）：
 *   1. `0 * * * *`   每小时：CF Analytics → D1 同步（原 tc-web-admin-analytics-cron）
 *   2. `0 * * * *`   其中 UTC 01:00（北京 09:00）：重跑 blog + regulations 最新生产部署，
 *                    把当天到日期的定时发布文章放出来
 *   3. 每 5 分钟（每小时的 0/5/10/…/55 分）：投递已审核通过的报告邮件（原 tc-web-portal-email-cron）
 *
 * Deployed with: npx wrangler deploy
 *
 * This is a WORKER, not a Pages Function, so cron triggers are always
 * properly registered by wrangler.
 *
 * 手动触发（全部需 `Authorization: Bearer $CRON_SECRET`）：
 *   GET /health      — 整体健康检查（Analytics 配置/D1/最近同步）
 *   GET /sync        — 手动跑一次 Analytics 同步
 *   GET /cleanup     — 重跑路由过滤（历史数据清理）
 *   GET /email/run   — 手动投递一批报告邮件（?limit=20）
 *   GET /email/health— 邮件投递配置检查
 */

import { ensureDailyCFCache, ensureHourlyCFCache, isBreadcrumbPath, isPagePath, safeJSON } from "../../../apps/admin/functions/lib/d1-cache";
import { hasConfig } from "../../../apps/admin/functions/lib/cf-analytics";
import { graphql } from "../../../apps/admin/functions/lib/cf-analytics";

interface Env {
  DB: any;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ZONE_ID?: string;
  /** Secret key for manual HTTP trigger (optional) */
  CRON_SECRET?: string;
  /**
   * 定时发布兜底：每天对博客站「重跑一次最新生产部署」。
   * Deploy Hook 在这里没用——同一 commit 会被 CF 判 304 直接跳过，
   * 而定时发布恰恰是"代码没变、只是日期到了"，必须走 retry 接口强制重建。
   */
  PAGES_ACCOUNT_ID?: string;
  /** 报告邮件投递：portal 站点地址（原文具 cron 的 [vars] 搬过来） */
  PORTAL_URL?: string;
  /** 报告邮件投递：与 portal Pages 同名的内部口令（写进 x-stc-internal 头） */
  CREEM_WEBHOOK_SECRET?: string;
}

/** 定时任务注册表：cron 表达式 → 任务，改这里有且只有这一处要同步改 */
const CRON_ANALYTICS = "0 * * * *";
const CRON_EMAIL = "*/5 * * * *";

/**
 * 报告邮件投递（原 tc-web-portal-email-cron 的职责）。
 *
 * 不直接发信，只调 portal 的 `POST /api/report/drain`——发信逻辑、模板、
 * 状态落库都在 portal 侧，这里只负责「按时踹一脚」。口令用 portal 同值的
 * `CREEM_WEBHOOK_SECRET`（走 x-stc-internal 头），与 CRON_SECRET 是两套。
 *
 * 幂等：drain 只处理已审核（approved）且未发送的记录，重复调用不会重发。
 */
async function drainReportEmails(
  env: Env,
  limit = 20
): Promise<{ ok: boolean; status?: number; body?: string; error?: string }> {
  if (!env.CREEM_WEBHOOK_SECRET) {
    console.error("[tc-web-cron] email drain: CREEM_WEBHOOK_SECRET 未配置");
    return { ok: false, error: "CREEM_WEBHOOK_SECRET not configured" };
  }
  const base = (env.PORTAL_URL || "https://tc-web-portal.pages.dev").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/report/drain?limit=${limit}`, {
      method: "POST",
      headers: { "x-stc-internal": env.CREEM_WEBHOOK_SECRET },
    });
    const body = await res.text();
    if (!res.ok) {
      console.error(`[tc-web-cron] email drain failed ${res.status}: ${body.slice(0, 300)}`);
      return { ok: false, status: res.status, body: body.slice(0, 300) };
    }
    console.log(`[tc-web-cron] email drain ok: ${body.slice(0, 200)}`);
    return { ok: true, status: res.status, body: body.slice(0, 300) };
  } catch (err: any) {
    console.error("[tc-web-cron] email drain error:", err?.message || String(err));
    return { ok: false, error: String(err) };
  }
}

/**
 * 每日触发一次博客重建（定时发布兜底）。
 *
 * 为什么用 retry 而不是 Deploy Hook：Deploy Hook 走的是"同分支新的构建"，
 * 对同一个 commit 会返回 304 跳过；而定时发布的场景正是「代码没变、日期到了」，
 * 必须对现有部署强制重建一次。
 *
 * 只在 UTC 01:00（= 北京时间 09:00）那一跑执行；构建失败只记日志，不影响分析同步。
 */
async function triggerBlogRebuild(env: Env): Promise<void> {
  const token = env.CLOUDFLARE_API_TOKEN;
  const account = env.PAGES_ACCOUNT_ID;
  if (!token || !account) return;
  const base = `https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  try {
    for (const project of ["tc-web-blog", "tc-web-regulations"]) {
      const listRes = await fetch(`${base}/${project}/deployments?per_page=1&env=production`, { headers });
      const list = (await listRes.json()) as any;
      const latest = list?.result?.[0];
      if (!latest?.id) {
        console.error(`[tc-web-cron] ${project}: no production deployment found`);
        continue;
      }
      const res = await fetch(`${base}/${project}/deployments/${latest.id}/retry`, {
        method: "POST",
        headers,
      });
      console.log(`[tc-web-cron] ${project} rebuild:`, res.status);
    }
  } catch (err: any) {
    console.error("[tc-web-cron] daily rebuild failed:", err?.message || String(err));
  }
}

async function runAnalyticsSync(env: Env): Promise<{ ok: boolean; message: string }> {
  console.log("[tc-web-cron] started");

  if (!hasConfig(env)) {
    const msg = "Analytics not configured — check CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID";
    console.error("[tc-web-cron]", msg);
    return { ok: false, message: msg };
  }

  const dailyResult = await ensureDailyCFCache(env);
  if (dailyResult) {
    console.error("[tc-web-cron] daily error:", dailyResult);
    return { ok: false, message: "daily: " + dailyResult };
  }

  try {
    await ensureHourlyCFCache(env);
  } catch (err: any) {
    const msg = "hourly: " + (err?.message || err);
    console.error("[tc-web-cron]", msg);
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
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // 邮件投递（每 5 分钟）：独立走一条，跑完就返回，不碰 Analytics。
    // 注意 `0 * * * *` 与 `*/5 * * * *` 在整点会各自触发一次，靠 event.cron 精确区分。
    if (event.cron === CRON_EMAIL) {
      console.log("[tc-web-cron] scheduled: email drain");
      ctx.waitUntil(drainReportEmails(env, 20));
      return;
    }

    // 定时发布：每天 UTC 01:00 触发一次博客重建，把当天到日期的文章放出来
    const hourUtc = new Date(event.scheduledTime ?? Date.now()).getUTCHours();
    if (hourUtc === 1) {
      await triggerBlogRebuild(env);
    }

    const result = await runAnalyticsSync(env);
    console.log("[tc-web-cron] result:", JSON.stringify(result));

    // Log health diagnostics regardless of sync result
    const health = await healthCheck(env);
    if (!health.ok) {
      console.error("[tc-web-cron] health check failed:", JSON.stringify(health.details));
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

    // 邮件投递配置检查（不真发）
    if (url.pathname === "/email/health") {
      return new Response(
        JSON.stringify(
          {
            ok: !!env.CREEM_WEBHOOK_SECRET,
            configured: !!env.CREEM_WEBHOOK_SECRET,
            portal: env.PORTAL_URL || "https://tc-web-portal.pages.dev",
            cron: CRON_EMAIL,
          },
          null,
          2
        ),
        { status: env.CREEM_WEBHOOK_SECRET ? 200 : 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // 手动投递一批报告邮件
    if (url.pathname === "/email/run") {
      const limitRaw = parseInt(url.searchParams.get("limit") || "20", 10);
      const limit = Math.min(50, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20));
      const result = await drainReportEmails(env, limit);
      return new Response(JSON.stringify(result), {
        status: result.ok ? 200 : 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Cleanup — re-filter existing page_data + page_paths with the current
    // routing-architecture rules (inferProject + isPagePath).
    if (url.pathname === "/cleanup") {
      try {
        const out: any = { ok: true, daily: { cleanedData: 0, cleanedPaths: 0 }, hourly: { cleanedData: 0, cleanedPaths: 0 } };

        // ── daily_page_stats ──
        const daily: any = await env.DB.prepare(
          "SELECT date, page_data, page_paths FROM daily_page_stats WHERE page_data IS NOT NULL OR page_paths IS NOT NULL"
        ).all();
        for (const row of (daily.results || []) as any[]) {
          const data: { path: string; count: number }[] = safeJSON(row.page_data, []) ?? [];
          const paths: { path: string; count: number }[] = safeJSON(row.page_paths, []) ?? [];
          const cleanData = data.filter((p) => isBreadcrumbPath(p.path));
          const cleanPaths = paths.filter((p) => isPagePath(p.path));
          if (cleanData.length !== data.length || cleanPaths.length !== paths.length) {
            await env.DB.prepare(
              "UPDATE daily_page_stats SET page_data = ?, page_paths = ? WHERE date = ?"
            ).bind(JSON.stringify(cleanData), JSON.stringify(cleanPaths), row.date).run();
            if (cleanData.length !== data.length) out.daily.cleanedData++;
            if (cleanPaths.length !== paths.length) out.daily.cleanedPaths++;
          }
        }

        // ── hourly_page_stats ──
        const hourly: any = await env.DB.prepare(
          "SELECT date, hour, page_data, page_paths FROM hourly_page_stats WHERE page_data IS NOT NULL OR page_paths IS NOT NULL"
        ).all();
        for (const row of (hourly.results || []) as any[]) {
          const data: { path: string; count: number }[] = safeJSON(row.page_data, []) ?? [];
          const paths: { path: string; count: number }[] = safeJSON(row.page_paths, []) ?? [];
          const cleanData = data.filter((p) => isBreadcrumbPath(p.path));
          const cleanPaths = paths.filter((p) => isPagePath(p.path));
          if (cleanData.length !== data.length || cleanPaths.length !== paths.length) {
            await env.DB.prepare(
              "UPDATE hourly_page_stats SET page_data = ?, page_paths = ? WHERE date = ? AND hour = ?"
            ).bind(JSON.stringify(cleanData), JSON.stringify(cleanPaths), row.date, row.hour).run();
            if (cleanData.length !== data.length) out.hourly.cleanedData++;
            if (cleanPaths.length !== paths.length) out.hourly.cleanedPaths++;
          }
        }

        return new Response(JSON.stringify(out), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ ok: false, error: (err?.message || String(err)).slice(0, 500) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Default: sync
    const result = await runAnalyticsSync(env);
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 500,
      headers: { "Content-Type": "application/json" },
    });
  },
};
