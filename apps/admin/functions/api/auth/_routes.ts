/**
 * Admin auth APIs
 * POST /api/auth/login — Login
 * POST /api/auth/logout — Logout
 * GET /api/auth/me — Current admin
 */

export { onRequest as loginHandler } from "./login";
export { onRequest as logoutHandler } from "./logout";
export { onRequest as meHandler } from "./me";
