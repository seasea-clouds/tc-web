/**
 * 报告访问控制 —— guest_token（匿名访问令牌）
 *
 * 背景：报告 ID 由前端生成（形如 `CCC-1757...-ab12`），可被枚举/猜测，
 * 因此 `/api/report/:id` 不能只凭 ID 放行。规则：
 *   1. 请求携带 `?t=<guest_token>` 且与 D1 中该报告的 guest_token 一致 → 放行
 *   2. 或：请求带有效登录会话，且报告 user_email 与该用户邮箱一致 → 放行
 *   3. 其它情况 → 404（不区分「不存在」与「无权限」，避免存在性探测）
 *
 * guest_token 由服务端在报告首次落库时生成，回传给浏览器（localStorage）并写入邮件链接。
 */

/** 生成 32 字节随机十六进制令牌 */
export function generateGuestToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 等长常量时间比较（避免时序侧信道） */
export function safeEqual(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * 确保报告行存在 guest_token（幂等）。返回当前有效 token（失败返回空串）。
 * 报告行不存在时返回空串（调用方需先保证已插入）。
 */
export async function ensureGuestToken(db: any, reportId: string): Promise<string> {
  if (!db || !reportId) return "";
  try {
    const row: any = await db
      .prepare("SELECT guest_token FROM reports WHERE id = ?")
      .bind(reportId)
      .first();
    if (row?.guest_token) return row.guest_token;
    if (!row) return "";

    const token = generateGuestToken();
    await db
      .prepare(
        "UPDATE reports SET guest_token = ? WHERE id = ? AND (guest_token IS NULL OR guest_token = '')"
      )
      .bind(token, reportId)
      .run();

    const after: any = await db
      .prepare("SELECT guest_token FROM reports WHERE id = ?")
      .bind(reportId)
      .first();
    return after?.guest_token || "";
  } catch (err) {
    console.error("[report-access] ensureGuestToken failed:", err);
    return "";
  }
}

export interface ReportAccessRow {
  id: string;
  guest_token?: string | null;
  user_email?: string | null;
}

/** 是否允许访问该报告 */
export function canAccessReport(
  row: ReportAccessRow,
  providedToken: string | null,
  sessionEmail: string | null
): boolean {
  // 1) 匿名令牌匹配
  if (row.guest_token && safeEqual(row.guest_token, providedToken)) return true;

  // 2) 登录用户是报告所有者
  if (row.user_email && sessionEmail) {
    if (row.user_email.toLowerCase() === sessionEmail.toLowerCase()) return true;
  }

  return false;
}
