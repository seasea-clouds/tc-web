/**
 * Get current user from session cookie
 * GET /api/auth/me
 * Returns user info if session is valid, 401 otherwise
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

  return Response.json({ user });
}
