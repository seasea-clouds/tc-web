/**
 * Admin auth helper — client side
 */

export interface AdminUser {
  id: string;
  username: string;
  name: string;
}

export async function login(username: string, password: string, turnstileToken?: string): Promise<AdminUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, turnstileToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Login failed" }));
    throw new Error(err.error || "Login failed");
  }
  const data = await res.json();
  return data.admin;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  try {
    const res = await fetch("/api/auth/me");
    if (!res.ok) return null;
    const data = await res.json();
    return data.admin;
  } catch {
    return null;
  }
}
