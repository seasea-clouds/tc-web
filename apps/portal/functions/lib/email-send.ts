/**
 * 报告邮件发送（门户 Functions 共用）
 *
 * 调用方：
 *   - api/payment/webhook.ts（付费/内部：即时发送，带 x-stc-internal）
 *   - lib/email-queue.ts（免费自查：管理员审核通过后发送）
 *
 * 说明：账户未开通 R2（错误码 10042），故不再从 R2 取 PDF，一律按 D1 里的
 * input_data 现算报告 + 现生成 PDF 附件。
 */

import { runModule, buildEmailHtml, bufferToBase64 } from "./report-common";
import { generateReportPdf } from "./pdf";

/** 模块标签 → runModule 需要的短键 */
const MODULE_KEY_BY_LABEL: Record<string, string> = {
  "gacc food registration": "gacc",
  "chinese label compliance": "label",
  "ccc certification": "ccc",
  "cosmetics filing (nmpa)": "nmpa",
  "cross-border e-commerce": "crossborder",
  "brand protection": "trademark",
};

/** 把库里的 module 值（可能是 `ccc`，也可能是 `CCC Certification`）归一成短键 */
export function moduleKeyOf(module?: string | null): string {
  const raw = (module || "").trim().toLowerCase();
  if (!raw) return "";
  if (MODULE_KEY_BY_LABEL[raw]) return MODULE_KEY_BY_LABEL[raw];
  return raw;
}

export interface SendReportEmailParams {
  reportId: string;
  email: string;
  module?: string;
  locale?: string;
  inputData?: Record<string, any>;
  /** 报告访问令牌，用于邮件内链接 */
  accessToken?: string;
}

export interface SendReportEmailResult {
  ok: boolean;
  reportId: string;
  moduleLabel: string;
  pdfAttached: boolean;
  error?: string;
}

/** 报告在线链接（带访问令牌） */
export function buildReportUrl(reportId: string, locale?: string, accessToken?: string): string {
  const base = `https://sinotradecompliance.com/${locale || "en"}/c/report/?id=${encodeURIComponent(reportId)}`;
  return accessToken ? `${base}&t=${encodeURIComponent(accessToken)}` : base;
}

export async function sendReportEmail(
  env: any,
  params: SendReportEmailParams
): Promise<SendReportEmailResult> {
  const reportId = params.reportId;
  const email = (params.email || "").trim();
  let moduleKey = moduleKeyOf(params.module);
  let locale = params.locale || "en";
  let inputData: Record<string, any> | null = params.inputData || null;
  let accessToken = params.accessToken || "";

  if (!reportId || !email) {
    return { ok: false, reportId, moduleLabel: "", pdfAttached: false, error: "Missing reportId or email" };
  }
  if (!env.RESEND_API_KEY) {
    return { ok: false, reportId, moduleLabel: "", pdfAttached: false, error: "RESEND_API_KEY not configured" };
  }

  // ── 1. 以 D1 中的数据为准（避免调用方伪造内容）────────────────────
  let row: any = null;
  if (env.DB) {
    try {
      row = await env.DB.prepare(
        "SELECT module, input_data, locale, guest_token FROM reports WHERE id = ?"
      )
        .bind(reportId)
        .first();
    } catch (err) {
      console.error("[email-send] D1 lookup failed:", err);
    }
  }
  if (row) {
    if (row.locale) locale = row.locale;
    if (row.guest_token) accessToken = row.guest_token;
    if (row.input_data) {
      try {
        inputData = JSON.parse(row.input_data);
      } catch {}
    }
    if (row.module) moduleKey = moduleKeyOf(row.module);
  }
  if (!inputData) {
    return { ok: false, reportId, moduleLabel: "", pdfAttached: false, error: "Report data not found" };
  }

  // ── 2. 现算报告内容 + PDF 附件 ───────────────────────────────────
  let moduleLabel = "Compliance Report";
  let productName = inputData.productName || "your product";
  let pdfBytes: Uint8Array | null = null;

  if (moduleKey) {
    try {
      const { moduleLabel: ml, result, nextSteps } = await runModule(moduleKey, inputData);
      moduleLabel = ml;
      productName = inputData.productName || productName;
      if (env.RESEND_API_KEY) {
        pdfBytes = await generateReportPdf({
          reportId,
          module: moduleLabel,
          generatedAt: new Date().toISOString().split("T")[0],
          productInfo: {
            name: inputData.productName ?? "",
            category: inputData.category ?? "",
            hsCode: inputData.hsCode,
            originCountry: inputData.originCountry ?? "",
          },
          result,
          nextSteps,
        });
      }
    } catch (err) {
      console.error("[email-send] report rebuild failed:", err);
    }
  }

  // ── 3. 通过 Resend 发送 ─────────────────────────────────────────
  const attachments = pdfBytes
    ? [
        {
          filename: `compliance-report-${reportId}.pdf`,
          content: bufferToBase64(pdfBytes),
          content_type: "application/pdf" as const,
        },
      ]
    : [];

  try {
    const res = await fetch("https://api.resend.com/email", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || "send@sinotradecompliance.com",
        to: email,
        subject: `Your Compliance Report — ${moduleLabel} — SinoTrade Compliance`,
        html: buildEmailHtml({
          productName,
          reportId,
          reportUrl: buildReportUrl(reportId, locale, accessToken),
          module: moduleLabel,
        }),
        attachments,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[email-send] Resend failed for ${reportId}: ${errText}`);
      return {
        ok: false,
        reportId,
        moduleLabel,
        pdfAttached: !!pdfBytes,
        error: errText.slice(0, 500),
      };
    }

    return { ok: true, reportId, moduleLabel, pdfAttached: !!pdfBytes };
  } catch (err) {
    console.error("[email-send] send error:", err);
    return { ok: false, reportId, moduleLabel, pdfAttached: !!pdfBytes, error: String(err).slice(0, 500) };
  }
}
