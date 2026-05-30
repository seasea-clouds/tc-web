/**
 * List user reports API
 * GET /api/reports/list
 * Header: Authorization: Bearer <token>
 */

import { jwtVerify } from 'jose';

function getSecret(env: any): Uint8Array {
  const secret = env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return new TextEncoder().encode(secret);
}

async function verifyToken(token: string, env: any) {
  const { payload } = await jwtVerify(token, getSecret(env));
  return { userId: payload.userId as string, email: payload.email as string };
}

interface Env {
  DB: any;
  JWT_SECRET: any;
}

export async function onRequest(context: { request: Request; env: Env }) {
  if (context.request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const auth = context.request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = auth.slice(7);
    const payload = await verifyToken(token, context.env);

    const reports = await context.env.DB.prepare(
      `SELECT id, module, product_name, payment_status, created_at
       FROM reports
       WHERE user_email = (SELECT email FROM users WHERE id = ?)
       ORDER BY created_at DESC
       LIMIT 50`
    ).bind(payload.userId).all();

    return Response.json({ reports: reports.results });
  } catch {
    return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
}
