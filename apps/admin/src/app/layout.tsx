"use client";

import "./globals.css";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, Repeat, FileText, ClipboardList, CreditCard, LogOut, Menu, X, ChevronLeft, ChevronRight
} from "lucide-react";
import { getCurrentAdmin, logout, AdminUser } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "数据看板", icon: LayoutDashboard },
  { href: "/users", label: "用户管理", icon: Users },
  { href: "/subscriptions", label: "订阅管理", icon: Repeat },
  { href: "/reports", label: "报告管理", icon: FileText },
  { href: "/logs", label: "操作日志", icon: ClipboardList },
  { href: "/payments", label: "支付与订单", icon: CreditCard },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLoginPage = pathname === "/login" || pathname === "/login/";

  useEffect(() => {
    // Skip auth check on login page
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    getCurrentAdmin().then((user) => {
      if (!user) {
        router.replace("/login");
      } else {
        setAdmin(user);
      }
      setLoading(false);
    });
  }, [isLoginPage, router]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  // If it's the login page, render with minimal wrapper
  if (isLoginPage) {
    return (
      <html lang="zh-CN">
        <head>
          <title>Admin 登录 — SinoTrade Compliance</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body>{children}</body>
      </html>
    );
  }

  if (loading) {
    return (
      <html lang="zh-CN">
        <head>
          <title>Admin — SinoTrade Compliance</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div className="spinner" />
        </body>
      </html>
    );
  }

  return (
    <html lang="zh-CN">
      <head>
        <title>Admin — SinoTrade Compliance</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        {/* Sidebar */}
        <aside className={`sidebar ${mobileMenuOpen ? "open" : ""} ${sidebarCollapsed ? "collapsed" : ""}`}>
          <div className="brand">
            <h1>SinoTrade Admin</h1>
            <p>管理后台</p>
          </div>

          {/* Close button for mobile */}
          <button className="sidebar-close-btn" onClick={() => setMobileMenuOpen(false)} aria-label="关闭菜单">
            <X size={20} />
          </button>

          {/* Collapse toggle for desktop */}
          <button className="sidebar-collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label={sidebarCollapsed ? "展开侧栏" : "收起侧栏"}>
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          <nav style={{ padding: "0.75rem" }}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive ? "active" : ""}
                >
                  <Icon size={18} style={{ display: "inline", verticalAlign: "middle" }} />
                  <span className="nav-label" style={{ marginLeft: "0.5rem" }}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <div className="main-content">
          {/* Top bar */}
          <header className="topbar">
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {/* Mobile hamburger */}
              <button
                className="btn btn-outline mobile-menu-btn"
                style={{ padding: "0.375rem" }}
                onClick={() => setMobileMenuOpen(true)}
                aria-label="打开菜单"
              >
                <Menu size={18} />
              </button>
              {/* Desktop collapse toggle */}
              <button
                className="btn btn-outline desktop-collapse-btn"
                style={{ padding: "0.375rem" }}
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                aria-label={sidebarCollapsed ? "展开侧栏" : "收起侧栏"}
              >
                {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>
                {NAV_ITEMS.find((i) => pathname?.startsWith(i.href))?.label || "Admin"}
              </h2>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                {admin?.name || admin?.username}
              </span>
              <button className="btn btn-outline" style={{ padding: "0.375rem 0.75rem" }} onClick={handleLogout}>
                <LogOut size={16} />
                退出
              </button>
            </div>
          </header>

          {/* Content area */}
          <main className="content-area">
            {children}
          </main>
        </div>

        {/* Mobile overlay backdrop */}
        <div className={`sidebar-overlay ${mobileMenuOpen ? "visible" : ""}`} onClick={() => setMobileMenuOpen(false)} />
      </body>
    </html>
  );
}
