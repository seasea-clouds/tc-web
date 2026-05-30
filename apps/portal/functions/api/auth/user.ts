/**
 * Get current user info from token
 * GET /api/auth/user
 * Header: Authorization: Bearer <token>
 */

import { verifyToken } from './jwt';

interface Env {
  DB: any;
  JWT_SECRET: string;
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

    const user = await context.env.DB.prepare(
      'SELECT id, email, name, locale FROM users WHERE id = ?'
    ).bind(payload.userId).first() as any;

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    return Response.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch {
    return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
}
