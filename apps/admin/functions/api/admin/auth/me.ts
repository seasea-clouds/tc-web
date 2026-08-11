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
    // 200 + {admin: null} (not 401) so unauthenticated browser calls don't
    // log a console error (PageSpeed "browser errors were logged to the
    // console" audit). Client getCurrentAdmin() treats null the same way.
    return Response.json({ admin: null });
  }
}
