/**
 * Admin Login
 * POST /api/auth/login
 * Body: { username, password, turnstileToken }
 */

import { createAdminSession } from "../../../lib/admin-session";
import { createLog } from "../../../lib/log";

interface Env {
  DB: any;
  TURNSTILE_SECRET_KEY?: string;
  ADMIN_JWT_SECRET?: string;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Naive comparison for MVP — will be replaced with proper hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashInput = encoder.encode(hash);

  // For now, use a simple text comparison as a placeholder
  // In production, use password hashing like bcrypt
  const { subtle } = crypto;
  const key = await subtle.importKey(
    "raw",
    encoder.encode("admin-password"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await subtle.sign("HMAC", key, data);
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // First admin: username=admin, password=admin123 (will change after first login)
  // For comparison against stored hash
  return hex === hash;
}

export async function onRequest(context: { request: Request; env: Env }) {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { username, password } = await context.request.json();
    if (!username || !password) {
      return Response.json({ error: "用户名和密码不能为空" }, { status: 400 });
    }

    // Find admin
    const admin: any = await context.env.DB.prepare(
      "SELECT id, username, name, password_hash FROM admin_users WHERE username = ?",
    )
      .bind(username)
      .first();

    if (!admin) {
      return Response.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    // Verify password (simple comparison for MVP)
    const encoder = new TextEncoder();
    const { subtle } = crypto;
    const key = await subtle.importKey(
      "raw",
      encoder.encode("admin-password"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await subtle.sign("HMAC", key, encoder.encode(password));
    const hex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (hex !== admin.password_hash) {
      // Try direct comparison for plain text (MVP)
      if (password !== admin.password_hash) {
        return Response.json({ error: "用户名或密码错误" }, { status: 401 });
      }
    }

    // Create session
    const { cookie } = await createAdminSession(context.env.DB, admin.id);

    // Log the login
    await createLog(context.env.DB, {
      adminId: admin.id,
      adminName: admin.name || admin.username,
      action: "login",
      targetType: "admin",
      targetId: admin.id,
      targetSummary: admin.username,
      detail: JSON.stringify({ username: admin.username }),
    });

    return new Response(
      JSON.stringify({
        admin: { id: admin.id, username: admin.username, name: admin.name || admin.username },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookie,
        },
      },
    );
  } catch (err: any) {
    return Response.json({ error: err.message || "登录失败" }, { status: 500 });
  }
}
