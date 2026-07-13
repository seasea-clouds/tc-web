/**
 * Admin session management (analogous to portal's session.ts)
 */

const SESSION_COOKIE = "admin_sid";
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface AdminSessionUser {
  adminId: string;
  username: string;
  name: string;
}

function generateSessionId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createAdminSession(
  db: any,
  adminId: string,
): Promise<{ cookie: string; sessionId: string }> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString();

  await db
    .prepare("INSERT INTO admin_sessions (id, admin_id, expires_at) VALUES (?, ?, ?)")
    .bind(sessionId, adminId, expiresAt)
    .run();

  const cookie = `${SESSION_COOKIE}=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${Math.floor(SESSION_MAX_AGE_MS / 1000)}`;
  return { cookie, sessionId };
}

export function getAdminSessionId(request: Request): string | null {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match ? match[1] : null;
}

export async function verifyAdminSession(
  db: any,
  sessionId: string,
): Promise<AdminSessionUser | null> {
  try {
    const row: any = await db
      .prepare(
        `SELECT s.id, s.expires_at, s.admin_id, a.username, a.name
         FROM admin_sessions s
         JOIN admin_users a ON a.id = s.admin_id
         WHERE s.id = ?`,
      )
      .bind(sessionId)
      .first();

    if (!row) return null;
    if (new Date(row.expires_at) < new Date()) {
      await db.prepare("DELETE FROM admin_sessions WHERE id = ?").bind(sessionId).run();
      return null;
    }
    return { adminId: row.admin_id, username: row.username, name: row.name || row.username };
  } catch {
    return null;
  }
}

export async function deleteAdminSession(db: any, sessionId: string): Promise<void> {
  await db.prepare("DELETE FROM admin_sessions WHERE id = ?").bind(sessionId).run();
}

export function clearAdminSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

/** Require admin auth — returns 401 if not authenticated */
export async function requireAdmin(
  request: Request,
  env: any,
): Promise<AdminSessionUser> {
  if (!env.DB) {
    throw new AuthError("Database not configured");
  }
  const sessionId = getAdminSessionId(request);
  if (!sessionId) {
    throw new AuthError("Not authenticated");
  }
  const admin = await verifyAdminSession(env.DB, sessionId);
  if (!admin) {
    throw new AuthError("Session expired");
  }
  return admin;
}

export class AuthError extends Error {
  status = 401;
}
