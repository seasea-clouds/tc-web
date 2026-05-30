import type { PaymentProvider, PaymentSession, PaymentEvent } from "./provider";

interface CreemConfig {
  apiKey: string;
  webhookSecret: string;
}

/** Creem 支付实现 */
export class CreemProvider implements PaymentProvider {
  name = "creem";

  private config: CreemConfig;

  constructor(config: CreemConfig) {
    this.config = config;
  }

  async createCheckout(params: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
    successUrl: string;
    cancelUrl: string;
  }): Promise<PaymentSession> {
    const res = await fetch("https://api.creem.io/v1/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.config.apiKey,
      },
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency,
        metadata: params.metadata,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
      }),
    });

    if (!res.ok) {
      throw new Error(`Creem checkout failed: ${await res.text()}`);
    }

    const data = await res.json();
    return { url: data.checkout_url, sessionId: data.id };
  }

  async createSubscription(params: {
    priceId: string;
    customerEmail: string;
    metadata: Record<string, string>;
    successUrl: string;
    cancelUrl: string;
  }): Promise<PaymentSession> {
    const res = await fetch("https://api.creem.io/v1/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.config.apiKey,
      },
      body: JSON.stringify({
        price_id: params.priceId,
        customer: { email: params.customerEmail },
        metadata: params.metadata,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
      }),
    });

    if (!res.ok) {
      throw new Error(`Creem subscription failed: ${await res.text()}`);
    }

    const data = await res.json();
    return { url: data.checkout_url, sessionId: data.id };
  }

  verifyWebhook(payload: unknown, signature: string): PaymentEvent {
    // TODO: Verify Creem webhook signature
    const event = payload as Record<string, unknown>;
    return {
      type: event.type as PaymentEvent["type"],
      sessionId: String(event.id ?? ""),
      customerEmail: String((event as any).customer?.email ?? ""),
      metadata: (event as any).metadata ?? {},
      amount: Number((event as any).amount ?? 0),
      currency: String((event as any).currency ?? "usd"),
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await fetch(`https://api.creem.io/v1/subscriptions/${subscriptionId}/cancel`, {
      method: "POST",
      headers: { "X-API-Key": this.config.apiKey },
    });
  }
}
