/**
 * Admin Logout
 * POST /api/auth/logout
 */

import { getAdminSessionId, deleteAdminSession, clearAdminSessionCookie } from "../../../lib/admin-session";

interface Env {
  DB: any;
}

export async function onRequest(context: { request: Request; env: Env }) {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const sessionId = getAdminSessionId(context.request);
  if (sessionId) {
    await deleteAdminSession(context.env.DB, sessionId);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearAdminSessionCookie(),
    },
  });
}
