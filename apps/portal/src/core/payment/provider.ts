/** 支付提供商接口 — 松耦合可扩展 */

export interface PaymentSession {
  url: string;
  sessionId: string;
}

export interface PaymentEvent {
  type: "checkout.completed" | "subscription.created" | "subscription.cancelled";
  sessionId: string;
  customerEmail: string;
  metadata: Record<string, string>;
  amount: number;
  currency: string;
  subscriptionId?: string;
}

export interface PaymentProvider {
  name: string;
  /** 创建支付会话 */
  createCheckout(params: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
    successUrl: string;
    cancelUrl: string;
  }): Promise<PaymentSession>;

  /** 验证 Webhook 回调 */
  verifyWebhook(payload: unknown, signature: string): PaymentEvent;

  /** 创建订阅 */
  createSubscription(params: {
    priceId: string;
    customerEmail: string;
    metadata: Record<string, string>;
    successUrl: string;
    cancelUrl: string;
  }): Promise<PaymentSession>;

  /** 取消订阅 */
  cancelSubscription(subscriptionId: string): Promise<void>;
}
