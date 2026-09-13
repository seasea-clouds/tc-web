/**
 * Save report to D1 (called by the free self-check flow before redirecting to the report page)
 * POST /api/report/save
 * Body: { reportId, module, inputData, resultData, nextSteps, locale?, paymentStatus? }
 * Resp: { ok, reportId, saved, guestToken }
 *
 * 说明（2026-09-13）：
 *   - 免费自查报告写 payment_status='free_campaign'（不再冒充已支付 'completed'）；
 *     公开路径只接受 free_campaign / free_with_subscription / pending，防止伪造「已支付」。
 *   - 生成并返回 guest_token（报告访问令牌），同时保留已有令牌不覆盖。
 */

import { getSessionId, verifySession } from '../../lib/session';
import { generateGuestToken, ensureGuestToken } from '../../lib/report-access';

interface Env {
  DB: any; // D1Database
}

/** 公开路径允许写入的支付状态（'completed' / 'refunded' 只能由支付 webhook 写） */
const PUBLIC_PAYMENT_STATUSES = ['free_campaign', 'free_with_subscription', 'pending'];

export async function onRequest(context: {
  request: Request;
  env: Env;
}) {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { reportId, module, inputData, resultData, nextSteps, locale, paymentStatus } = await context.request.json();

    if (!reportId || !module) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!resultData && paymentStatus !== 'completed') {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const status = PUBLIC_PAYMENT_STATUSES.includes(paymentStatus) ? paymentStatus : 'free_campaign';

    // ── Resolve user from session cookie ─────────────────────────────
    let userEmail = '';
    try {
      const sessionId = getSessionId(context.request);
      if (sessionId && context.env.DB) {
        const user = await verifySession(context.env.DB, sessionId);
        if (user) userEmail = user.email;
      }
    } catch {}

    const reportMeta = {
      result: resultData,
      nextSteps: nextSteps || [],
    };

    let saved = false;
    let guestToken = '';
    if (context.env.DB) {
      const token = generateGuestToken();
      const result = await context.env.DB.prepare(
        `INSERT INTO reports
           (id, module, product_name, hs_code, origin_country,
            input_data, result_data, user_email, payment_status, locale, guest_token, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           module = excluded.module,
           product_name = excluded.product_name,
           hs_code = excluded.hs_code,
           origin_country = excluded.origin_country,
           input_data = excluded.input_data,
           result_data = excluded.result_data,
           user_email = COALESCE(excluded.user_email, reports.user_email),
           locale = excluded.locale,
           payment_status = CASE
             WHEN reports.payment_status IN ('completed', 'refunded', 'free_with_subscription')
               THEN reports.payment_status
             ELSE excluded.payment_status
           END,
           guest_token = COALESCE(NULLIF(reports.guest_token, ''), excluded.guest_token)`
      )
        .bind(
          reportId,
          module,
          inputData?.productName || '',
          inputData?.hsCode || '',
          inputData?.originCountry || '',
          JSON.stringify(inputData || {}),
          JSON.stringify(reportMeta),
          userEmail || null,
          status,
          locale || 'en',
          token
        )
        .run();
      saved = result?.success === true || result?.meta?.changes > 0;
      guestToken = await ensureGuestToken(context.env.DB, reportId);
    }

    return Response.json({ ok: true, reportId, saved: !!context.env.DB && saved, guestToken });
  } catch (err) {
    console.error("Report save error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
