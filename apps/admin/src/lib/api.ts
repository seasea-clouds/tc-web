/**
 * Admin API helper — client side
 */

const API_BASE = "/api/admin";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
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
