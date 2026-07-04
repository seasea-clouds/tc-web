/**
 * Admin auth APIs
 * POST /api/admin/auth/login — Login
 * POST /api/admin/auth/logout — Logout
 * GET /api/admin/auth/me — Current admin
 */

export { onRequest as loginHandler } from "./login";
export { onRequest as logoutHandler } from "./logout";
export { onRequest as meHandler } from "./me";
