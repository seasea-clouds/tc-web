/**
 * Verify Turnstile token against Cloudflare's siteverify API
 *
 * Usage:
 *   import { verifyTurnstileToken } from '../../lib/verify-turnstile';
 *   const { success } = await verifyTurnstileToken(token, env.TURNSTILE_SECRET_KEY);
 */

export async function verifyTurnstileToken(
  token: string,
  secret: string,
): Promise<{ success: boolean; error?: string }> {
  const formData = new URLSearchParams();
  formData.append('secret', secret);
  formData.append('response', token);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  return { success: data.success === true, error: data['error-codes']?.[0] };
}
