/** 邮件提供商接口 — 松耦合可扩展 */

export interface SendEmailParams {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
    contentType: string;
  }>;
}

export interface SendEmailResult {
  messageId: string;
}

export interface EmailProvider {
  name: string;
  send(params: SendEmailParams): Promise<SendEmailResult>;
  sendTemplate(params: {
    to: string;
    templateName: string;
    data: Record<string, unknown>;
  }): Promise<SendEmailResult>;
}
