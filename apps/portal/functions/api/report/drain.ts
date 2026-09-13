/**
 * 邮件队列投递端点（内部专用）
 *
 * POST|GET /api/report/drain
 * Header: x-stc-internal: <CREEM_WEBHOOK_SECRET>
 *
 * 取出 email_queue 里已由管理员审核通过（status='approved'）的报告邮件并发送。
 * 调用方：独立 Worker `tc-web-portal-email-cron`（每 5 分钟，wrangler cron trigger）。
 *
 * 为什么用独立 Worker 而不是 Pages Functions 的 _scheduled.ts：
 *   Cloudflare Pages Functions **不支持** cron trigger（schedule 导出不会注册），
 *   只有 Worker（wrangler.toml [triggers] crons）才会真正按计划触发。
 *   `_scheduled.ts` 因此从未按计划运行过（2026-09-13 实证后移除）。
 */

import { drainApprovedQueue } from "../../lib/email-queue";

interface Env {
  DB: any;
  CREEM_WEBHOOK_SECRET?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}

export async function onRequest(context: {
  request: Request;
  env: Env;
  waitUntil?: (p: Promise<any>) => void;
}) {
  const method = context.request.method;
  if (method !== "POST" && method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secret = context.env.CREEM_WEBHOOK_SECRET;
  const provided = context.request.headers.get("x-stc-internal");
  if (!secret || provided !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!context.env.RESEND_API_KEY) {
    return Response.json({ ok: false, error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const limit = Math.min(50, Math.max(1, parseInt(new URL(context.request.url).searchParams.get("limit") || "20", 10) || 20));
  const result = await drainApprovedQueue(context.env, limit);
  console.log(`[email-drain] processed=${result.processed} sent=${result.sent} failed=${result.failed}`);
  return Response.json({ ok: true, ...result });
}
