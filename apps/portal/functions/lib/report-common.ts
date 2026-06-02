/**
 * Shared report utilities — MODULE_RESOLVERS + helpers
 * Used by generate-pdf.ts, send-email.ts, webhook.ts, etc.
 */

// ─── Module resolver ──────────────────────────────────────────────────
// Each module exports: checkFn(input) -> {requiresRegistration, riskCategory, ...}
//                     reportFn(input) -> {result, nextSteps}

const MODULE_RESOLVERS: Record<string, () => Promise<{
  checkFn: (input: any) => any;
  reportFn: (input: any) => any;
  moduleLabel: string;
}>> = {
  gacc: async () => {
    const { checkGacc } = await import("../../modules/gacc/rules");
    const { generateGaccReport } = await import("../../modules/gacc/report");
    return { checkFn: checkGacc, reportFn: generateGaccReport, moduleLabel: "GACC Food Registration" };
  },
  label: async () => {
    const { checkLabel } = await import("../../modules/label/rules");
    const { generateLabelReport } = await import("../../modules/label/report");
    return { checkFn: checkLabel, reportFn: generateLabelReport, moduleLabel: "Chinese Label Compliance" };
  },
  ccc: async () => {
    const { checkCcc } = await import("../../modules/ccc/rules");
    const { generateCccReport } = await import("../../modules/ccc/report");
    return { checkFn: checkCcc, reportFn: generateCccReport, moduleLabel: "CCC Certification" };
  },
  nmpa: async () => {
    const { checkCosmetics } = await import("../../modules/nmpa/rules");
    const { generateCosmeticsReport } = await import("../../modules/nmpa/report");
    return { checkFn: checkCosmetics, reportFn: generateCosmeticsReport, moduleLabel: "Cosmetics Filing (NMPA)" };
  },
  crossborder: async () => {
    const { checkCrossborder } = await import("../../modules/crossborder/rules");
    const { generateCrossborderReport } = await import("../../modules/crossborder/report");
    return { checkFn: checkCrossborder, reportFn: generateCrossborderReport, moduleLabel: "Cross-Border E-commerce" };
  },
  trademark: async () => {
    const { checkTrademark } = await import("../../modules/trademark/rules");
    const { generateTrademarkReport } = await import("../../modules/trademark/report");
    return { checkFn: checkTrademark, reportFn: generateTrademarkReport, moduleLabel: "Brand Protection" };
  },
};

export { MODULE_RESOLVERS };

// ─── Module label lookup (no dynamic import needed) ──────────────────

export function getModuleLabel(module: string): string {
  const labels: Record<string, string> = {
    gacc: "GACC Food Registration",
    label: "Chinese Label Compliance",
    ccc: "CCC Certification",
    nmpa: "Cosmetics Filing (NMPA)",
    crossborder: "Cross-Border E-commerce",
    trademark: "Brand Protection",
  };
  return labels[module] ?? "Compliance Report";
}

// ─── Run check + generate report data ────────────────────────────────

export async function runModule(
  moduleKey: string,
  inputData: Record<string, any>
): Promise<{
  moduleLabel: string;
  result: Record<string, any>;
  nextSteps: string[];
}> {
  const mod = moduleKey.toLowerCase();
  const resolver = MODULE_RESOLVERS[mod];
  if (!resolver) throw new Error(`Unknown module: ${moduleKey}`);

  const { checkFn, reportFn, moduleLabel } = await resolver();
  checkFn(inputData);

  const report = reportFn({
    category: inputData.category,
    originCountry: inputData.originCountry,
    productName: inputData.productName,
    hsCode: inputData.hsCode,
  });

  return {
    moduleLabel,
    result: report.result || {
      requiresRegistration: false,
      isHighRisk: false,
      riskCategory: "",
      summary: "Compliance assessment completed.",
      requiredDocuments: [],
    },
    nextSteps: report.nextSteps || [],
  };
}

// ─── Email helpers ───────────────────────────────────────────────────

export function buildEmailHtml(params: {
  productName: string;
  reportId: string;
  reportUrl: string;
  module: string;
}): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin:0 auto; padding:20px;">
  <div style="background:#1B365D; color:#fff; padding:24px; border-radius:8px 8px 0 0; text-align:center;">
    <h1 style="margin:0; font-size:20px;">Your Compliance Report</h1>
    <p style="margin:8px 0 0; opacity:0.8;">${params.module}</p>
  </div>
  <div style="background:#fff; border:1px solid #e5e7eb; padding:24px; border-radius:0 0 8px 8px;">
    <p>Hi,</p>
    <p>Your compliance report for <strong>${params.productName}</strong> is ready.</p>
    <p>Report ID: <strong>${params.reportId}</strong></p>
    <p style="font-size:12px; color:#666;">A PDF copy is attached to this email.</p>
    <div style="text-align:center; margin:24px 0;">
      <a href="${params.reportUrl}" style="display:inline-block; background:#D4AF37; color:#1B365D; text-decoration:none; padding:12px 32px; border-radius:6px; font-weight:bold; font-size:14px;">View Full Report Online</a>
    </div>
    <hr style="border:none; border-top:1px solid #eee; margin:20px 0;">
    <p style="font-size:12px; color:#999; text-align:center;">SinoTrade Compliance<br>david@sinotradecompliance.com | sinotradecompliance.com</p>
  </div>
</body></html>`;
}

// ─── Base64 helper ───────────────────────────────────────────────────

export function bufferToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
