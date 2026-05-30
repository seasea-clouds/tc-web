import type { EmailProvider, SendEmailParams, SendEmailResult } from "./provider";

interface ResendConfig {
  apiKey: string;
  from: string;
}

/** Resend 邮件实现 */
export class ResendProvider implements EmailProvider {
  name = "resend";
  private config: ResendConfig;

  constructor(config: ResendConfig) {
    this.config = config;
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const res = await fetch("https://api.resend.com/email", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.config.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        attachments: params.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          content_type: a.contentType,
        })),
      }),
    });

    if (!res.ok) {
      throw new Error(`Resend send failed: ${await res.text()}`);
    }

    const data = await res.json();
    return { messageId: data.id };
  }

  async sendTemplate(params: {
    to: string;
    templateName: string;
    data: Record<string, unknown>;
  }): Promise<SendEmailResult> {
    // For MVP: send as regular email
    return this.send({
      to: params.to,
      subject: `Your Compliance Report - SinoTrade Compliance`,
      text: `Hi,\n\nHere's your compliance report.\n\nView it here: ${params.data.reportUrl}\n\n- SinoTrade Compliance Team`,
    });
  }
}
