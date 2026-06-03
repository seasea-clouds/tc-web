/**
 * List user reports API
 * GET /api/reports/list
 * Uses httpOnly session cookie (same as AuthProvider)
 */

import { getSessionId, verifySession } from '../../lib/session';

interface Env {
  DB: any;
}

export async function onRequest(context: { request: Request; env: Env }) {
  if (context.request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Authenticate via session cookie
  const sessionId = getSessionId(context.request);
  if (!sessionId) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = await verifySession(context.env.DB, sessionId);
  if (!user) {
    return Response.json({ error: 'Session expired' }, { status: 401 });
  }

  const reports = await context.env.DB.prepare(
    `SELECT id, module, product_name, payment_status, created_at
     FROM reports
     WHERE user_email = ?
     ORDER BY created_at DESC
     LIMIT 50`
  ).bind(user.email).all();

  return Response.json({ reports: reports.results });
}
