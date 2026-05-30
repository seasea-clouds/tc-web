/**
 * Login API — httpOnly Cookie session
 * POST /api/auth/login
 * Body: { email, password, rememberMe? }
 * Sets httpOnly session cookie on success
 */

import { verifyPassword } from './password';
import { createSession } from '../../lib/session';

interface Env {
  DB: any;
}

export async function onRequest(context: { request: Request; env: Env }) {
  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { email, password, rememberMe } = await context.request.json();
    if (!email || !password) {
      return Response.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Find user
    const user = await context.env.DB.prepare(
      'SELECT id, email, name, password_hash FROM users WHERE email = ?'
    ).bind(email).first() as any;

    if (!user || !user.password_hash) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Verify password
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Create session → set httpOnly cookie
    const { cookie } = await createSession(context.env.DB, user.id, !!rememberMe);

    return new Response(JSON.stringify({
      user: { id: user.id, email: user.email, name: user.name },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Login failed' }, { status: 500 });
  }
}
