/**
 * Get single report by ID
 * GET /api/report/:id?t=<guest_token>
 *
 * 访问控制（2026-09-13 加固）：报告 ID 可被枚举，不能只凭 ID 放行。
 *   1) `?t=` 令牌与库里的 guest_token 一致 → 放行
 *   2) 或登录会话邮箱 == 报告 user_email → 放行
 *   3) 其余一律 404（不区分「不存在」与「无权限」，避免存在性探测）
 *
 * 前端：报告页会把 URL 里的 t 或 localStorage 里同 id 的令牌一并带上（见 report-client.tsx）。
 * 邮件里的报告链接也带 t（见 functions/lib/email-send.ts buildReportUrl）。
 */

import { getSessionId, verifySession } from '../../lib/session';
import { canAccessReport } from '../../lib/report-access';

interface Env {
  DB: any; // D1Database
}

// 访问令牌的 URL 参数名（避免内联字面量触发 check-t-keys 的 t('...') 误判）
const REPORT_TOKEN_PARAM = 't';

export async function onRequest(context: { request: Request; env: Env; params: { id: string } }) {
  if (context.request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { id } = context.params;

  if (!id) {
    return Response.json({ error: 'Missing report ID' }, { status: 400 });
  }

  const url = new URL(context.request.url);
  const providedToken = url.searchParams.get(REPORT_TOKEN_PARAM);

  // 登录会话（可选）
  let sessionEmail: string | null = null;
  try {
    const sessionId = getSessionId(context.request);
    if (sessionId && context.env?.DB) {
      const user = await verifySession(context.env.DB, sessionId);
      if (user) sessionEmail = user.email;
    }
  } catch {}

  // If D1 is available, try to fetch from DB
  if (context.env?.DB) {
    try {
      const row: any = await context.env.DB.prepare('SELECT * FROM reports WHERE id = ?').bind(id).first();
      if (row) {
        if (!canAccessReport({ id: row.id, guest_token: row.guest_token, user_email: row.user_email }, providedToken, sessionEmail)) {
          return Response.json({ error: 'Report not found' }, { status: 404 });
        }
        // Parse stored result data (the full compliance report)
        let resultData = { requiresRegistration: false, isHighRisk: false, riskCategory: '', summary: '', requiredDocuments: [] };
        let nextStepsData: string[] = [];
        if (row.result_data) {
          try {
            const parsed = JSON.parse(row.result_data);
            resultData = parsed.result || parsed;
            nextStepsData = parsed.nextSteps || [];
          } catch {}
        }
        
        // Parse product info from input_data
        let productInfo = { name: '', category: '', hsCode: '', originCountry: '', brandName: '' };
        if (row.input_data) {
          try {
            const inputData = JSON.parse(row.input_data);
            productInfo = {
              name: (inputData.productName as string) || row.product_name || '',
              category: (inputData.category as string) || '',
              hsCode: (inputData.hsCode as string) || row.hs_code || '',
              originCountry: (inputData.originCountry as string) || row.origin_country || '',
              brandName: (inputData.brandName as string) || '',
            };
          } catch {}
        }
        
        return Response.json({
          id: row.id,
          module: row.module,
          productInfo,
          result: resultData,
          nextSteps: nextStepsData,
          generatedAt: row.created_at || '',
        });
      }
    } catch {}
  }

  return Response.json({ error: 'Report not found' }, { status: 404 });
}
