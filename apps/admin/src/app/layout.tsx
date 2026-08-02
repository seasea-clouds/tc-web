"use client";

import "./globals.css";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, Repeat, FileText, ClipboardList, CreditCard, LogOut, Menu, X, ChevronLeft, ChevronRight, Lock
} from "lucide-react";
import { getCurrentAdmin, logout, AdminUser } from "@/lib/auth";
import { buildAdminT } from "@/lib/i18n";
import ChangePasswordModal from "@/components/ChangePasswordModal";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const t = buildAdminT();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const NAV_ITEMS = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/users", label: t("nav.users"), icon: Users },
    { href: "/subscriptions", label: t("nav.subscriptions"), icon: Repeat },
    { href: "/reports", label: t("nav.reports"), icon: FileText },
    { href: "/logs", label: t("nav.logs"), icon: ClipboardList },
    { href: "/payments", label: t("nav.payments"), icon: CreditCard },
  ];

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
          <title>{t("login.title")}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/admin/favicon.ico" sizes="any" />
          <link rel="icon" href="/admin/icon.png" type="image/png" />
          <link rel="apple-touch-icon" href="/admin/icon.png" />
        </head>
        <body>{children}</body>
      </html>
    );
  }

  if (loading) {
    return (
      <html lang="zh-CN">
        <head>
          <title>{t("nav.dashboard")} — SinoTrade Compliance</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/admin/favicon.ico" sizes="any" />
          <link rel="icon" href="/admin/icon.png" type="image/png" />
          <link rel="apple-touch-icon" href="/admin/icon.png" />
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
        <title>SinoTrade Compliance Admin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/admin/favicon.ico" sizes="any" />
        <link rel="icon" href="/admin/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/admin/icon.png" />
      </head>
      <body>
        {/* Sidebar */}
        <aside className={`sidebar ${mobileMenuOpen ? "open" : ""} ${sidebarCollapsed ? "collapsed" : ""}`}>
          <div className="brand">
            <h1>SinoTrade Admin</h1>
            <p>{t("sidebar.subtitle")}</p>
          </div>

          {/* Close button for mobile */}
          <button className="sidebar-close-btn" onClick={() => setMobileMenuOpen(false)} aria-label={t("sidebar.closeMenu")}>
            <X size={20} />
          </button>

          {/* Collapse toggle for desktop */}
          <button className="sidebar-collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label={sidebarCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}>
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
        <div className={`main-content ${sidebarCollapsed ? "collapsed" : ""}`}>
          {/* Top bar */}
          <header className="topbar">
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {/* Mobile hamburger */}
              <button
                className="btn btn-outline mobile-menu-btn"
                style={{ padding: "0.375rem" }}
                onClick={() => setMobileMenuOpen(true)}
                aria-label={t("sidebar.openMenu")}
              >
                <Menu size={18} />
              </button>
              {/* Desktop collapse toggle */}
              <button
                className="btn btn-outline desktop-collapse-btn"
                style={{ padding: "0.375rem" }}
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                aria-label={sidebarCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
              >
                {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>
                {NAV_ITEMS.find((i) => pathname?.startsWith(i.href))?.label || "Admin"}
              </h2>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                {admin?.name || admin?.username}
              </span>
              <button className="btn btn-outline" style={{ padding: "0.375rem 0.5rem", fontSize: "0.8rem" }} onClick={() => setShowChangePassword(true)} title={t("topbar.changePassword")}>
                <Lock size={14} />
                <span style={{ marginLeft: "0.25rem" }}>{t("topbar.changePassword")}</span>
              </button>
              <button className="btn btn-outline" style={{ padding: "0.375rem 0.75rem" }} onClick={handleLogout}>
                <LogOut size={16} />
              {t("topbar.logout")}
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

        {/* Change Password Modal */}
        <ChangePasswordModal
          show={showChangePassword}
          onClose={() => setShowChangePassword(false)}
          onResult={showToast}
        />

        {/* Toast notification */}
        {toast && (
          <div className={`toast toast-${toast.type}`} style={{ position: "fixed", top: "1rem", right: "1rem", zIndex: 999 }}>
            {toast.message}
          </div>
        )}
      </body>
    </html>
  );
}
