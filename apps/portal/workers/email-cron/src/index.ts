/**
 * Email Queue Cron — 独立 Worker，每 5 分钟投递已审核通过的报告邮件。
 *
 * 部署：npx wrangler deploy（在 apps/portal/workers/email-cron 目录）
 * 口令：npx wrangler secret put CREEM_WEBHOOK_SECRET <<< "<与 portal Pages 相同的值>"
 *
 * 为什么不用 Pages Functions 的 _scheduled.ts：
 *   Cloudflare Pages Functions 不支持 cron trigger（schedule 导出不会被注册），
 *   只有 Worker 的 [triggers] crons 才会真正按计划运行。
 *
 * 手动触发（排障用）：
 *   curl -H "x-stc-internal: $CREEM_WEBHOOK_SECRET" "https://tc-web-portal-email-cron.<subdomain>.workers.dev/run?limit=20"
 *   curl "https://tc-web-portal-email-cron.<subdomain>.workers.dev/health"
 */

interface Env {
  PORTAL_URL: string;
  CREEM_WEBHOOK_SECRET?: string;
}

async function drain(env: Env, limit = 20): Promise<{ ok: boolean; status?: number; body?: string; error?: string }> {
  if (!env.CREEM_WEBHOOK_SECRET) {
    console.error("[email-cron] CREEM_WEBHOOK_SECRET 未配置");
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
      console.error(`[email-cron] drain failed ${res.status}: ${body.slice(0, 300)}`);
      return { ok: false, status: res.status, body: body.slice(0, 300) };
    }
    console.log(`[email-cron] drain ok: ${body.slice(0, 200)}`);
    return { ok: true, status: res.status, body: body.slice(0, 300) };
  } catch (err) {
    console.error("[email-cron] drain error:", err);
    return { ok: false, error: String(err) };
  }
}

export default {
  async scheduled(_controller: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log("[email-cron] scheduled run");
    ctx.waitUntil(drain(env, 20));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        configured: !!env.CREEM_WEBHOOK_SECRET,
        portal: env.PORTAL_URL || "https://tc-web-portal.pages.dev",
      });
    }
    if (url.pathname === "/run") {
      const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20));
      const result = await drain(env, limit);
      return Response.json(result, { status: result.ok ? 200 : 502 });
    }
    return new Response("tc-web-portal-email-cron: use /health or /run", { status: 404 });
  },
};
