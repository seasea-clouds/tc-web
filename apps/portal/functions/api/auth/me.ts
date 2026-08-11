/**
 * Get current user from session cookie
 * GET /api/auth/me
 * Returns user info if session is valid, 200 + {user: null} otherwise.
 *
 * NOTE: Returns 200 (not 401) for the unauthenticated case on purpose — the
 * AuthProvider calls this endpoint on every page load, and a 401 would be
 * logged as a console error by the browser ("Failed to load resource: 401"),
 * which fails the PageSpeed "browser errors were logged to the console" audit.
 */

import { getSessionId, verifySession } from '../../lib/session';

interface Env {
  DB: any;
}

export async function onRequest(context: { request: Request; env: Env }) {
  if (context.request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!context.env.DB) {
    return Response.json({ error: 'Server configuration error: database not available' }, { status: 500 });
  }

  const sessionId = getSessionId(context.request);
  if (!sessionId) {
    return Response.json({ user: null });
  }

  const user = await verifySession(context.env.DB, sessionId);
  if (!user) {
    return Response.json({ user: null });
  }

  return Response.json({ user });
}
