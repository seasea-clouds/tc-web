/**
 * 报告邮件 —— 发送请求入口
 *
 * POST /api/report/send-email
 * Body: { reportId, email, module, inputData?, locale? }
 *
 * 两种模式（2026-09-13 加固）：
 *   1) 内部/付费：请求头 `x-stc-internal` 等于 CREEM_WEBHOOK_SECRET → 立即发送
 *      （Creem webhook 调用；付费交付不能等人工审核）
 *   2) 公开（免费自查流程）→ **不直接发送**，写入 email_queue 等管理后台人工审核
 *      返回 { ok:true, queued:true, reviewStatus:'pending' }
 *
 * 背景：本端点无鉴权、收件人由请求体决定，原先等于把我们域名当开放邮件发送源。
 * 审核后台：apps/admin → /admin/emails
 * 实际发送逻辑：functions/lib/email-send.ts
 * 投递触发：独立 Worker `tc-web-portal-email-cron`（每 5 分钟）调 /api/report/drain；
 *          本端点被调用时也会 waitUntil 顺带 drain 一小批作为兜底
 *          （Pages Functions 不支持 cron，故不能用 _scheduled.ts）
 */

import { enqueueEmail, drainApprovedQueue } from "../../lib/email-queue";
import { sendReportEmail } from "../../lib/email-send";

interface Env {
  DB: any; // D1Database
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  CREEM_WEBHOOK_SECRET?: string;
}

export async function onRequest(context: {
  request: Request;
  env: Env;
  waitUntil?: (promise: Promise<any>) => void;
}) {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body: any = await context.request.json().catch(() => null);
    const { reportId, email, module: moduleKey, inputData, locale } = body || {};

    if (!reportId || !email) {
      return Response.json(
        { error: "Missing required fields: reportId, email" },
        { status: 400 }
      );
    }

    const internalSecret = context.env.CREEM_WEBHOOK_SECRET;
    const isInternal =
      !!internalSecret && context.request.headers.get("x-stc-internal") === internalSecret;

    // ── 1. 内部/付费：立即发送 ─────────────────────────────────────
    if (isInternal) {
      const send = await sendReportEmail(context.env, {
        reportId,
        email,
        module: moduleKey,
        inputData,
        locale,
      });
      return Response.json({
        ok: send.ok,
        reportId,
        mode: "immediate",
        emailSent: send.ok,
        pdfAttached: send.pdfAttached,
        error: send.error,
      });
    }

    // ── 2. 公开：入队待审 ─────────────────────────────────────────
    const queued = await enqueueEmail(context.env.DB, {
      reportId,
      toEmail: email,
      module: moduleKey,
      locale,
      ip: context.request.headers.get("CF-Connecting-IP") || undefined,
      source: "free_check",
    });

    if (!queued.ok) {
      const status = queued.error === "Report not found" ? 404 : 400;
      return Response.json({ ok: false, error: queued.error }, { status });
    }

    // 顺带投递一小批已审核通过的邮件（cron Worker 之外的兜底，不阻塞响应）
    try {
      context.waitUntil?.(drainApprovedQueue(context.env, 3));
    } catch {}

    return Response.json({
      ok: true,
      reportId,
      queued: true,
      reviewStatus: queued.status,
      duplicate: !!queued.duplicate,
      emailSent: false,
    });
  } catch (err) {
    console.error("send-email error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
