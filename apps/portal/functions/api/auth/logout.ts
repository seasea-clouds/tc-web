/**
 * Logout API — clears session cookie
 * POST /api/auth/logout
 */

import { getSessionId, deleteSession, clearSessionCookie } from '../../lib/session';

interface Env {
  DB: any;
}

export async function onRequest(context: { request: Request; env: Env }) {
  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const sessionId = getSessionId(context.request);
  if (sessionId) {
    await deleteSession(context.env.DB, sessionId);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearSessionCookie(),
    },
  });
}
