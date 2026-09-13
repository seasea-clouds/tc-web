/**
 * 报告邮件审核队列（D1: email_queue）
 *
 * 为什么要队列：`/api/report/send-email` 完全无鉴权、收件人由请求体决定，
 * 等于把我们的域名当成开放邮件发送源（垃圾邮件/信誉风险）。改为：
 *
 *   免费自查（公开）→ 入队 status='pending' → 管理后台人工审核 → 'approved'
 *                                              → 发送 → 'sent' / 'failed'
 *   付费/内部（Creem webhook，带 x-stc-internal）→ 跳过审核，即时发送
 *
 * 发送时机：portal 定时函数（每 5 分钟）+ 公开端点被调用时 waitUntil 顺带 drain，
 * 两者都调用 drainApprovedQueue，因此即使定时函数未注册也不会卡住。
 */

import { sendReportEmail } from "./email-send";

export const EMAIL_QUEUE_MAX_ATTEMPTS = 3;

export interface EnqueueResult {
  ok: boolean;
  id?: string;
  status?: string;
  duplicate?: boolean;
  error?: string;
}

export interface EnqueueParams {
  reportId: string;
  toEmail: string;
  module?: string;
  locale?: string;
  ip?: string;
  source: "free_check" | "paid";
}

/** 入队一封待审核邮件（同一报告+收件人 24h 内去重；单报告 24h 最多 5 封） */
export async function enqueueEmail(db: any, p: EnqueueParams): Promise<EnqueueResult> {
  if (!db) return { ok: false, error: "DB not configured" };
  const toEmail = (p.toEmail || "").trim().toLowerCase();
  if (!p.reportId || !toEmail) return { ok: false, error: "Missing reportId or email" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) return { ok: false, error: "Invalid email" };

  try {
    // 报告必须已存在，避免被当成群发接口
    const report: any = await db
      .prepare("SELECT id FROM reports WHERE id = ?")
      .bind(p.reportId)
      .first();
    if (!report) return { ok: false, error: "Report not found" };

    // 去重：同一报告 + 同一收件人（未拒绝/未失败的）24h 内只保留一条
    const dup: any = await db
      .prepare(
        `SELECT id, status FROM email_queue
         WHERE report_id = ? AND lower(to_email) = ?
           AND status IN ('pending','approved','sent')
           AND created_at >= datetime('now','-1 day')
         ORDER BY created_at DESC LIMIT 1`
      )
      .bind(p.reportId, toEmail)
      .first();
    if (dup) return { ok: true, id: dup.id, status: dup.status, duplicate: true };

    // 频控：单报告 24h 最多 5 条
    const cnt: any = await db
      .prepare(
        `SELECT count(*) AS n FROM email_queue
         WHERE report_id = ? AND created_at >= datetime('now','-1 day')`
      )
      .bind(p.reportId)
      .first();
    if ((cnt?.n ?? 0) >= 5) return { ok: false, error: "Too many email requests for this report" };

    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO email_queue (id, report_id, to_email, module, locale, source, status, attempts, ip, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, datetime('now'))`
      )
      .bind(id, p.reportId, toEmail, p.module || "", p.locale || "en", p.source, p.ip || null)
      .run();

    return { ok: true, id, status: "pending" };
  } catch (err) {
    console.error("[email-queue] enqueue failed:", err);
    return { ok: false, error: String(err) };
  }
}

export interface DrainResult {
  processed: number;
  sent: number;
  failed: number;
}

/** 取出一批已审核通过的邮件并发送（幂等：先占位加 attempts 再发） */
export async function drainApprovedQueue(env: any, limit = 5): Promise<DrainResult> {
  const result: DrainResult = { processed: 0, sent: 0, failed: 0 };
  if (!env?.DB) return result;

  let rows: any[] = [];
  try {
    const res: any = await env.DB.prepare(
      `SELECT id, report_id, to_email, module, locale, attempts
       FROM email_queue
       WHERE status = 'approved' AND attempts < ?
       ORDER BY reviewed_at ASC, created_at ASC
       LIMIT ?`
    )
      .bind(EMAIL_QUEUE_MAX_ATTEMPTS, limit)
      .all();
    rows = res?.results || [];
  } catch (err) {
    console.error("[email-queue] drain query failed:", err);
    return result;
  }

  for (const row of rows) {
    result.processed++;
    const attempts = (row.attempts || 0) + 1;
    try {
      // 先占位，避免并发（cron + 请求内 drain）重复发送
      const claim: any = await env.DB.prepare(
        `UPDATE email_queue SET attempts = ? WHERE id = ? AND status = 'approved'`
      )
        .bind(attempts, row.id)
        .run();
      if (!(claim?.meta?.changes > 0)) continue;

      const send = await sendReportEmail(env, {
        reportId: row.report_id,
        email: row.to_email,
        module: row.module,
        locale: row.locale,
      });

      if (send.ok) {
        await env.DB.prepare(
          `UPDATE email_queue SET status = 'sent', sent_at = datetime('now'), error = NULL WHERE id = ?`
        )
          .bind(row.id)
          .run();
        result.sent++;
      } else {
        const nextStatus = attempts >= EMAIL_QUEUE_MAX_ATTEMPTS ? "failed" : "approved";
        await env.DB.prepare(
          `UPDATE email_queue SET status = ?, error = ? WHERE id = ?`
        )
          .bind(nextStatus, send.error || "send failed", row.id)
          .run();
        result.failed++;
      }
    } catch (err) {
      console.error("[email-queue] send failed:", err);
      const nextStatus = attempts >= EMAIL_QUEUE_MAX_ATTEMPTS ? "failed" : "approved";
      try {
        await env.DB.prepare(`UPDATE email_queue SET status = ?, error = ? WHERE id = ?`)
          .bind(nextStatus, String(err).slice(0, 500), row.id)
          .run();
      } catch {}
      result.failed++;
    }
  }

  return result;
}
