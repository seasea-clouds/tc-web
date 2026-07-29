"use client";

import { useState } from "react";
import { buildAdminT } from "@/lib/i18n";

interface ChangePasswordModalProps {
  show: boolean;
  onClose: () => void;
  onResult: (type: "success" | "error", message: string) => void;
}

export default function ChangePasswordModal({ show, onClose, onResult }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const t = buildAdminT();

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (newPassword !== confirmPassword) {
      onResult("error", t("changePassword.confirmMismatch"));
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        onResult("error", data.error || t("changePassword.failed"));
      } else {
        onResult("success", t("changePassword.success"));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        onClose();
      }
    } catch {
      onResult("error", t("changePassword.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 998,
          background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "1rem",
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          style={{
            background: "#fff", borderRadius: "0.75rem", padding: "1.5rem",
            width: "100%", maxWidth: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            position: "relative",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.25rem", color: "#1B365D" }}>
            {t("changePassword.title")}
          </h3>
          <p style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "1.25rem" }}>
            {t("changePassword.subtitle")}
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, marginBottom: "0.25rem", color: "#374151" }}>
                {t("changePassword.currentPassword")}
              </label>
              <input
                className="input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t("changePassword.currentPasswordPlaceholder")}
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, marginBottom: "0.25rem", color: "#374151" }}>
                {t("changePassword.newPassword")}
              </label>
              <input
                className="input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("changePassword.newPasswordPlaceholder")}
                required
                minLength={6}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, marginBottom: "0.25rem", color: "#374151" }}>
                {t("changePassword.confirmPassword")}
              </label>
              <input
                className="input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("changePassword.confirmPasswordPlaceholder")}
                required
                minLength={6}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
                disabled={loading}
                style={{ padding: "0.5rem 1rem" }}
              >
                {t("changePassword.cancel")}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ padding: "0.5rem 1rem", justifyContent: "center", minWidth: "6rem" }}
              >
                {loading ? t("changePassword.saving") : t("changePassword.submit")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
