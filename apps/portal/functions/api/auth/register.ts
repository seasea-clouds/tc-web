/**
 * Register API — httpOnly Cookie session
 * POST /api/auth/register
 * Body: { email, password, name? }
 */

import { hashPassword } from './password';
import { createSession } from '../../lib/session';

interface Env {
  DB: any;
}

export async function onRequest(context: { request: Request; env: Env }) {
  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { email, password, name } = await context.request.json();

    if (!email || !password) {
      return Response.json({ error: 'Email and password required' }, { status: 400 });
    }

    if (password.length < 5) {
      return Response.json({ error: 'Password must be at least 5 characters' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await context.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) {
      return Response.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Hash password and create user
    const { hash, salt } = await hashPassword(password);
    const id = crypto.randomUUID();
    const displayName = name || email.split('@')[0];

    await context.env.DB.prepare(
      'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)'
    ).bind(id, email, `${salt}:${hash}`, displayName).run();

    // Create session → set httpOnly cookie
    const { cookie } = await createSession(context.env.DB, id);

    return new Response(JSON.stringify({
      user: { id, email, name: displayName },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Registration failed' }, { status: 500 });
  }
}
