/**
 * Payment checkout helpers for check-client pages.
 * Calls POST /api/checkout to create a Creem checkout session,
 * then redirects the user to the payment page.
 */

interface CheckoutParams {
  reportId: string;
  email: string;
  locale: string;
  productName: string;
  category?: string;
  originCountry?: string;
  hsCode?: string;
  module: string;      // display name like "GACC Food Registration"
  moduleKey: string;   // key like "gacc"
}

/**
 * Initiate checkout for a single report.
 * Returns the checkout URL on success, or null on failure.
 */
export async function initiateCheckout(params: CheckoutParams): Promise<string | null> {
  try {
    const metadata: Record<string, string> = {
      report_id: params.reportId,
      module: params.moduleKey,
      productName: params.productName,
      locale: params.locale,
    };
    if (params.category) metadata.category = params.category;
    if (params.originCountry) metadata.originCountry = params.originCountry;
    if (params.hsCode) metadata.hsCode = params.hsCode;

    const body: Record<string, unknown> = {
      reportId: params.reportId,
      locale: params.locale,
      metadata,
    };
    if (params.email) body.email = params.email;

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.checkoutUrl || null;
  } catch {
    return null;
  }
}
