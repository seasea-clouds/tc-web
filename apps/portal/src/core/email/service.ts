import { ResendProvider } from "./resend";
import type { EmailProvider, SendEmailResult } from "./provider";

let _instance: EmailProvider | null = null;

function getProvider(): EmailProvider {
  if (!_instance) {
    _instance = new ResendProvider({
      apiKey: process.env.RESEND_API_KEY ?? "",
      from: process.env.EMAIL_FROM ?? "send@sinotradecompliance.com",
    });
  }
  return _instance;
}

/** Send compliance report to user */
export async function sendReportEmail(params: {
  to: string;
  reportId: string;
  reportUrl: string;
  productName: string;
  module: string;
  pdfBase64?: string;
}): Promise<SendEmailResult> {
  const provider = getProvider();

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1B365D; color: #fff; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 20px;">Your Compliance Report</h1>
    <p style="margin: 8px 0 0; opacity: 0.8; font-size: 14px;">${params.module}</p>
  </div>
  <div style="background: #fff; border: 1px solid #e5e7eb; padding: 24px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 14px; color: #333;">Hi,</p>
    <p style="font-size: 14px; color: #333;">
      Your compliance report for <strong>${params.productName}</strong> is ready.
    </p>
    <p style="font-size: 14px; color: #333;">
      Report ID: <strong>${params.reportId}</strong>
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${params.reportUrl}"
         style="display: inline-block; background: #D4AF37; color: #1B365D; 
                text-decoration: none; padding: 12px 32px; border-radius: 6px; 
                font-weight: bold; font-size: 14px;">
        View Full Report
      </a>
    </div>
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="font-size: 12px; color: #999; text-align: center;">
      SinoTrade Compliance<br>
      david@sinotradecompliance.com | sinotradecompliance.com
    </p>
  </div>
</body>
</html>`;

  const attachments = params.pdfBase64
    ? [
        {
          filename: `compliance-report-${params.reportId}.pdf`,
          content: params.pdfBase64,
          contentType: "application/pdf" as const,
        },
      ]
    : [];

  return provider.send({
    to: params.to,
    subject: `Your Compliance Report — ${params.module} — SinoTrade Compliance`,
    html,
    attachments,
  });
}

/** Send magic link for passwordless login */
export async function sendMagicLink(params: {
  to: string;
  link: string;
}): Promise<SendEmailResult> {
  const provider = getProvider();
  return provider.send({
    to: params.to,
    subject: "Sign in to Compliance Self-Check",
    html: `<p>Click <a href="${params.link}">here</a> to sign in. Expires in 15 minutes.</p>`,
  });
}
