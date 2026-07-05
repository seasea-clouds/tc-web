"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const turnstileRef = useRef<HTMLDivElement>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  useEffect(() => {
    // Load Turnstile script
    if (!(window as any).turnstile) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if ((window as any).turnstile && turnstileRef.current) {
          (window as any).turnstile.render(turnstileRef.current, {
            sitekey: "0x4AAAAAADqoEtL5oqrpaf3R",
            callback: (token: string) => setTurnstileToken(token),
          });
        }
      };
      document.head.appendChild(script);
    } else if ((window as any).turnstile && turnstileRef.current) {
      (window as any).turnstile.render(turnstileRef.current, {
        sitekey: "0x4AAAAAADqoEtL5oqrpaf3R",
        callback: (token: string) => setTurnstileToken(token),
      });
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!turnstileToken) {
      setError("请完成人机验证");
      return;
    }

    setLoading(true);

    try {
      await login(username, password, turnstileToken);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message || "登录失败，请重试");
      // Reset Turnstile
      if ((window as any).turnstile) {
        (window as any).turnstile.reset(turnstileRef.current);
      }
      setTurnstileToken("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>SinoTrade Admin</h1>
        <p className="subtitle">管理后台登录</p>

        {error && (
          <div style={{
            background: "#fef2f2", color: "#991b1b", padding: "0.75rem",
            borderRadius: "0.375rem", fontSize: "0.875rem", marginBottom: "1rem"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.375rem", color: "#374151" }}>
              用户名
            </label>
            <input
              className="input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
              autoFocus
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.375rem", color: "#374151" }}>
              密码
            </label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>

          <div
            ref={turnstileRef}
            style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "center" }}
          />

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "0.75rem" }}
            disabled={loading}
          >
            {loading ? "登录中..." : "登 录"}
          </button>
        </form>
      </div>
    </div>
  );
}
