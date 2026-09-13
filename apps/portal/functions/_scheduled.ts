/**
 * Scheduled Pages Function — 邮件审核队列投递（每 5 分钟）。
 *
 * 作用：把管理后台审核通过（status='approved'）的报告邮件真正发出去。
 * 需通过 git push 触发 CF Pages 构建才会注册 schedule（wrangler 直传不算）。
 *
 * 兜底：即使本定时函数未生效，公开端点 `/api/report/send-email` 每次被调用时
 * 也会用 context.waitUntil 顺带 drain 一小批，投递不会永久卡住。
 */

import { drainApprovedQueue } from "./lib/email-queue";

interface Env {
  DB: any;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { env } = context;
  console.log("[email-queue-cron] started");

  if (!env.RESEND_API_KEY) {
    console.error("[email-queue-cron] RESEND_API_KEY 未配置，跳过");
    return new Response("OK (no config)", { status: 200 });
  }

  const result = await drainApprovedQueue(env, 20);
  console.log(
    `[email-queue-cron] processed=${result.processed} sent=${result.sent} failed=${result.failed}`
  );
  return Response.json({ ok: true, ...result });
}

export const config = {
  schedule: "*/5 * * * *",
};
