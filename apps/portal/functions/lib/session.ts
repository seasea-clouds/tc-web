/**
 * Session management with httpOnly cookies
 * Sessions are stored in D1, referenced by a random token in the cookie
 */

const SESSION_COOKIE = 'sid';      // session id cookie name
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;  // 30 days
const SESSION_MAX_AGE_REMEMBER = 365 * 24 * 60 * 60 * 1000; // 1 year

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
}

/** Generate a cryptographically random session token */
function generateSessionId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Create a session for a user and return the Set-Cookie header value */
export async function createSession(
  db: any,
  userId: string,
  rememberMe = false
): Promise<{ cookie: string; sessionId: string }> {
  const sessionId = generateSessionId();
  const maxAge = rememberMe ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_MS;
  const expiresAt = new Date(Date.now() + maxAge).toISOString();

  await db.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(sessionId, userId, expiresAt).run();

  const cookie = `${SESSION_COOKIE}=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${Math.floor(maxAge / 1000)}`;

  return { cookie, sessionId };
}

/** Get the session token from a request's Cookie header */
export function getSessionId(request: Request): string | null {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match ? match[1] : null;
}

/** Verify a session token and return the user, or null if invalid/expired */
export async function verifySession(db: any, sessionId: string): Promise<SessionUser | null> {
  try {
    const row: any = await db.prepare(
      `SELECT s.id, s.expires_at, s.user_id, u.email, u.name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`
    ).bind(sessionId).first();

    if (!row) return null;
    if (new Date(row.expires_at) < new Date()) {
      // Expired — clean up
      await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
      return null;
    }
    return { userId: row.user_id, email: row.email, name: row.name };
  } catch {
    return null;
  }
}

/** Delete a session (logout) */
export async function deleteSession(db: any, sessionId: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
}

/** Generate a logout cookie header (clears the cookie) */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
