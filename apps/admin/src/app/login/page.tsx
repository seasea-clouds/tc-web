"use client";

import { useState, FormEvent, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";
import { buildAdminT } from "@/lib/i18n";

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAADqoEtL5oqrpaf3R";

// 渲染重试次数 / 退避基数：api.js 刚加载完时 render 会静默失败（这是"首次不出现验证码"的根因）
const RENDER_MAX_TRIES = 8;
const RENDER_BACKOFF_MS = 400;

export default function LoginPage() {
  const router = useRouter();
  const turnstileBoxRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const t = buildAdminT();
  const tRef = useRef(t);
  tRef.current = t;
  const [turnstileToken, setTurnstileToken] = useState("");

  /** 渲染验证码；已渲染过则返回 true。失败返回 false（由调用方重试）。 */
  const renderWidget = useCallback((): boolean => {
    const box = turnstileBoxRef.current;
    if (!box || !window.turnstile) return false;
    if (widgetIdRef.current) return true;
    // 容器里已经有内容（CF 自动渲染过 / 上一次 render 生效了）→ 不重复渲染
    if (box.childElementCount > 0) {
      widgetIdRef.current = "existing";
      return true;
    }
    try {
      const id = window.turnstile.render(box, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => {
          setTurnstileToken(token);
          setError("");
        },
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
        theme: "auto",
      });
      widgetIdRef.current = typeof id === "string" ? id : "rendered";
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    const attempt = () => {
      if (cancelled) return;
      if (renderWidget()) return;
      tries += 1;
      if (tries <= RENDER_MAX_TRIES) {
        setTimeout(attempt, RENDER_BACKOFF_MS + tries * 300);
      } else {
        setError(tRef.current("login.turnstileRequired"));
      }
    };

    if (window.turnstile) {
      // api.js 已就绪也要等 ready：直接 render 常常拿到一个空壳，正是"首次不显示"的原因
      if (typeof window.turnstile.ready === "function") window.turnstile.ready(attempt);
      else attempt();
      return () => { cancelled = true; };
    }

    // 复用已有脚本（页面热重载 / 其它组件已注入）
    const existing = document.querySelector<HTMLScriptElement>("script[data-stc-turnstile]");
    if (existing) {
      existing.addEventListener("load", attempt);
      return () => { cancelled = true; existing.removeEventListener("load", attempt); };
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.stcTurnstile = "1";
    script.onload = attempt;
    script.onerror = () => {
      // 被扩展 / 网络 / 地区拦截时给出明确提示，而不是静默无验证码
      if (!cancelled) setError(tRef.current("login.turnstileRequired"));
    };
    document.head.appendChild(script);
    return () => { cancelled = true; };
  }, [renderWidget]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!turnstileToken) {
      // 首次没渲染出来（扩展拦截、api.js 慢）→ 现在补渲染一次，用户再点一下就正常
      renderWidget();
      setError(t("login.turnstileRequired"));
      return;
    }

    setLoading(true);

    try {
      await login(username, password, turnstileToken);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message || t("login.failed"));
      const widgetId = widgetIdRef.current;
      if (widgetId && widgetId !== "existing" && widgetId !== "rendered") {
        window.turnstile?.reset(widgetId);
      } else if (turnstileBoxRef.current) {
        window.turnstile?.reset(turnstileBoxRef.current);
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
        <p className="subtitle">{t("login.subtitle")}</p>

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
              {t("login.username")}
            </label>
            <input
              className="input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("login.usernamePlaceholder")}
              required
              autoFocus
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.375rem", color: "#374151" }}>
              {t("login.password")}
            </label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("login.passwordPlaceholder")}
              required
            />
          </div>

          <div ref={turnstileBoxRef} style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "center", minHeight: "65px" }} />

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "0.75rem" }}
            disabled={loading}
          >
            {loading ? t("login.loggingIn") : t("login.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
