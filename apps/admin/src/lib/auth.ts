/**
 * Admin auth helper — client side
 */

export interface AdminUser {
  id: string;
  username: string;
  name: string;
}

// Local hint shared with packages/ui/src/LanguageSwitcher.tsx (same key).
// Lets the public site skip the /api/admin/auth/me call for every visitor who
// has never logged into the admin — i.e. all of them except real admins.
// It is only a "worth asking" flag; the server still verifies the session.
const ADMIN_HINT_KEY = 'stc.admin';

function setAdminHint(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(ADMIN_HINT_KEY, '1');
    else window.localStorage.removeItem(ADMIN_HINT_KEY);
  } catch {
    /* storage unavailable — degrade to never showing zh on public pages */
  }
}

export async function login(username: string, password: string, turnstileToken?: string): Promise<AdminUser> {
  const res = await fetch("/api/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, turnstileToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Login failed" }));
    throw new Error(err.error || "Login failed");
  }
  const data = await res.json();
  setAdminHint(true);
  return data.admin;
}

export async function logout(): Promise<void> {
  await fetch("/api/admin/auth/logout", { method: "POST" });
  setAdminHint(false);
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  try {
    const res = await fetch("/api/admin/auth/me");
    if (!res.ok) {
      setAdminHint(false);
      return null;
    }
    const data = await res.json();
    if (!data.admin) setAdminHint(false);
    return data.admin;
  } catch {
    return null;
  }
}
