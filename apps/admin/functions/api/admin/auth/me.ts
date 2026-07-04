/**
 * Get Current Admin
 * GET /api/auth/me
 */

import { requireAdmin } from "../../../lib/admin-session";

interface Env {
  DB: any;
}

export async function onRequest(context: { request: Request; env: Env }) {
  try {
    const admin = await requireAdmin(context.request, context.env);
    return Response.json({ admin });
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
}
