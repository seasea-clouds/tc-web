/**
 * List user reports API
 * GET /api/reports/list?limit=20&offset=0
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

  if (!context.env.DB) {
    return Response.json({ error: 'Server configuration error: database not available' }, { status: 500 });
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

  // Parse pagination params
  const url = new URL(context.request.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1), 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

  // Get total count (all reports for this user)
  const countResult = await context.env.DB.prepare(
    `SELECT COUNT(*) as total FROM reports WHERE user_email = ?`
  ).bind(user.email).first<{ total: number }>();
  const total = countResult?.total || 0;

  // Get paginated reports (all statuses)
  const reports = await context.env.DB.prepare(
    `SELECT id, module, product_name, payment_status, created_at
     FROM reports
     WHERE user_email = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(user.email, limit, offset).all();

  return Response.json({ reports: reports.results, total, limit, offset });
}
