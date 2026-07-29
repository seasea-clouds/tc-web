/**
 * Admin Change Password
 * POST /api/admin/auth/change-password
 * Body: { currentPassword, newPassword }
 *
 * Verifies current password, hashes new password, updates the database.
 * Does not invalidate existing sessions — user stays logged in.
 */

import { requireAdmin } from "../../../lib/admin-session";
import { createLog } from "../../../lib/log";

interface Env {
  DB: any;
}

export async function onRequest(context: { request: Request; env: Env }) {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let admin;
  try {
    admin = await requireAdmin(context.request, context.env);
  } catch {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await context.request.json();

    if (!currentPassword || !newPassword) {
      return Response.json({ error: "当前密码和新密码不能为空" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return Response.json({ error: "新密码长度至少 6 位" }, { status: 400 });
    }
    if (currentPassword === newPassword) {
      return Response.json({ error: "新密码不能与当前密码相同" }, { status: 400 });
    }

    // Get admin user from db
    const user: any = await context.env.DB.prepare(
      "SELECT id, username, name, password_hash FROM admin_users WHERE id = ?",
    )
      .bind(admin.adminId)
      .first();

    if (!user) {
      return Response.json({ error: "用户不存在" }, { status: 404 });
    }

    // Verify current password
    const encoder = new TextEncoder();
    const { subtle } = crypto;
    const key = await subtle.importKey(
      "raw",
      encoder.encode("admin-password"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await subtle.sign("HMAC", key, encoder.encode(currentPassword));
    const hex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Also support plain-text stored hash for backward compat
    if (hex !== user.password_hash && currentPassword !== user.password_hash) {
      return Response.json({ error: "当前密码错误" }, { status: 403 });
    }

    // Hash new password
    const newSignature = await subtle.sign("HMAC", key, encoder.encode(newPassword));
    const newHex = Array.from(new Uint8Array(newSignature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Update password in database
    await context.env.DB.prepare(
      "UPDATE admin_users SET password_hash = ? WHERE id = ?",
    )
      .bind(newHex, admin.adminId)
      .run();

    // Log the change
    await createLog(context.env.DB, {
      adminId: admin.adminId,
      adminName: admin.name || admin.username,
      action: "change_password",
      targetType: "admin",
      targetId: admin.adminId,
      targetSummary: admin.username,
      detail: JSON.stringify({ username: admin.username }),
    });

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message || "修改密码失败" }, { status: 500 });
  }
}
