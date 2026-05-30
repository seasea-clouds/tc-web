/**
 * Get user's subscription
 * GET /api/subscription
 * Requires valid session cookie
 */

import { getSessionId, verifySession } from '../../lib/session';

interface Env {
  DB: any;
}

export async function onRequest(context: { request: Request; env: Env }) {
  if (context.request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const sessionId = getSessionId(context.request);
  if (!sessionId) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = await verifySession(context.env.DB, sessionId);
  if (!user) {
    return Response.json({ error: 'Session expired' }, { status: 401 });
  }

  // Fetch subscription
  const sub = await context.env.DB.prepare(
    `SELECT id, plan, status, provider_subscription_id, current_period_start, current_period_end, created_at
     FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`
  ).bind(user.userId).first();

  return Response.json({ subscription: sub || null });
}
