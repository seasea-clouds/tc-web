/**
 * Admin Login
 * POST /api/admin/auth/login
 * Body: { username, password, turnstileToken }
 */

import { createAdminSession } from "../../../lib/admin-session";
import { createLog } from "../../../lib/log";

interface Env {
  DB: any;
  ADMIN_JWT_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
}

export async function onRequest(context: { request: Request; env: Env }) {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!context.env.DB) {
    return Response.json({ error: 'Server configuration error: database not available' }, { status: 500 });
  }

  try {
    const { username, password, turnstileToken } = await context.request.json();

    // Verify Turnstile (form-encoded, per CF API requirement — JSON not supported)
    if (!turnstileToken) {
      return Response.json({ error: "请完成人机验证" }, { status: 400 });
    }
    if (!context.env.TURNSTILE_SECRET_KEY) {
      return Response.json({ error: "服务器配置错误：人机验证未配置" }, { status: 500 });
    }
    const turnstileForm = new URLSearchParams();
    turnstileForm.append("secret", context.env.TURNSTILE_SECRET_KEY);
    turnstileForm.append("response", turnstileToken);
    const turnstileResp = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: turnstileForm },
    );
    const turnstileResult: any = await turnstileResp.json();
    if (!turnstileResult.success) {
      return Response.json({ error: "人机验证失败，请刷新后重试" }, { status: 400 });
    }
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

    // Verify password
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

    // Compare against stored password_hash
    if (hex !== admin.password_hash && password !== admin.password_hash) {
      return Response.json({ error: "用户名或密码错误" }, { status: 401 });
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
