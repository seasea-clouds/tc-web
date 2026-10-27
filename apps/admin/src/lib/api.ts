/**
 * Admin API helper — client side
 */

const API_BASE = "/api/admin";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  // 会话过期（cookie 到期 / 被清掉）时后端一律 401：先把本地状态清掉再回登录页，
  // 否则页面会停在一堆"加载失败"的骨架上，看起来像还能用。
  if (res.status === 401 && typeof window !== "undefined") {
    const here = window.location.pathname;
    if (!here.startsWith("/login")) {
      window.location.replace("/login");
    }
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

/** GET request */
export function get<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint);
}

/** POST request */
export function post<T>(endpoint: string, body: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** PUT request */
export function put<T>(endpoint: string, body: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/** DELETE request */
export function del<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: "DELETE" });
}
