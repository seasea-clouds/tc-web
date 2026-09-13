"use client";

import { useCallback, useEffect, useState } from "react";
import { get, post } from "@/lib/api";
import { buildAdminT } from "@/lib/i18n";
import { safeDateTime } from "@/lib/date";
import { Check, ExternalLink, RefreshCw, X } from "lucide-react";

/**
 * 邮件审核队列（2026-09-13）
 *
 * 背景：免费自查的「把报告发到我邮箱」原先直接调用 Resend，端点无鉴权、收件人由请求体决定，
 * 等于开放邮件发送源。现在所有免费自查邮件先入队（email_queue），在这里人工审核：
 *   待审核 → 通过（approved）→ 门户定时任务 5 分钟内投递 → 已发送（sent）
 *          → 拒绝（rejected）/ 失败（failed，可重试）
 * 付费/内部邮件（Creem webhook）不经过本队列，即时发送。
 */

interface EmailRow {
  id: string;
  report_id: string;
  to_email: string;
  module: string;
  locale: string;
  source: string;
  status: string;
  attempts: number;
  error?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  sent_at?: string | null;
  product_name?: string | null;
  report_user_email?: string | null;
  reportUrl?: string;
}

const TABS = ["pending", "approved", "sent", "rejected", "failed", "all"] as const;
type Tab = (typeof TABS)[number];

const MODULE_LABELS: Record<string, string> = {
  gacc: "module.gacc",
  label: "module.label",
  ccc: "module.ccc",
  nmpa: "module.nmpa",
  crossborder: "module.crossborder",
  trademark: "module.trademark",
  "GACC Food Registration": "module.gacc",
  "Chinese Label Compliance": "module.label",
  "CCC Certification": "module.ccc",
  "Cosmetics Filing (NMPA)": "module.nmpa",
  "Cross-Border E-commerce": "module.crossborder",
  "Brand Protection": "module.trademark",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-pending",
  approved: "badge-free",
  sent: "badge-completed",
  rejected: "badge-refunded",
  failed: "badge-refunded",
};

export default function EmailsPage() {
  const t = buildAdminT();
  const [tab, setTab] = useState<Tab>("pending");
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("status", tab);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (q.trim()) params.set("q", q.trim());
    get<{ emails: EmailRow[]; total: number; counts: Record<string, number> }>(`/emails?${params.toString()}`)
      .then((data) => {
        setEmails(data.emails || []);
        setTotal(data.total || 0);
        setCounts(data.counts || {});
        setSelected({});
      })
      .catch(() => showToast("error", t("emails.loadFailed")))
      .finally(() => setLoading(false));
  }, [tab, page, pageSize, q]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (action: "approve" | "reject" | "retry", ids: string[], reason?: string) => {
    if (ids.length === 0) return;
    setBusy(true);
    try {
      await post<{ ok: boolean; changed: number }>("/emails", { action, ids, reason });
      const key =
        action === "approve" ? "emails.toastApproved" : action === "reject" ? "emails.toastRejected" : "emails.toastRetried";
      showToast("success", t(key));
      load();
    } catch {
      showToast("error", t("emails.actionFailed"));
    } finally {
      setBusy(false);
    }
  };

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      {toast && (
        <div
          style={{
            position: "fixed", top: "1rem", right: "1rem", zIndex: 50,
            padding: "0.6rem 1rem", borderRadius: "0.5rem", fontSize: "0.85rem",
            background: toast.type === "success" ? "#065f46" : "#991b1b", color: "#fff",
          }}
        >
          {toast.message}
        </div>
      )}

      <div style={{ marginBottom: "1rem", fontSize: "0.85rem", color: "#6b7280", lineHeight: 1.6 }}>
        {t("emails.hint")}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {TABS.map((s) => (
          <button
            key={s}
            onClick={() => { setTab(s); setPage(1); }}
            className={s === tab ? "btn btn-primary" : "btn btn-outline"}
            style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
          >
            {t(`emails.tab.${s}`)} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
        <input
          className="input"
          style={{ maxWidth: "18rem" }}
          placeholder={t("emails.searchPlaceholder")}
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
        />
        <button className="btn btn-outline" onClick={load} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
          <RefreshCw size={14} /> {t("emails.refresh")}
        </button>
        {tab === "pending" && selectedIds.length > 0 && (
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={() => act("approve", selectedIds)}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
          >
            <Check size={14} /> {t("emails.approveSelected")} ({selectedIds.length})
          </button>
        )}
        <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>{t("emails.total")}: {total}</span>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                {tab === "pending" && (
                  <th style={{ width: "2.5rem" }}>
                    <input
                      type="checkbox"
                      checked={emails.length > 0 && selectedIds.length === emails.length}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? Object.fromEntries(emails.map((x) => [x.id, true]))
                            : {}
                        )
                      }
                    />
                  </th>
                )}
                <th>{t("emails.col.to")}</th>
                <th>{t("emails.col.module")}</th>
                <th>{t("emails.col.product")}</th>
                <th>{t("emails.col.status")}</th>
                <th>{t("emails.col.created")}</th>
                <th>{t("emails.col.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {emails.length === 0 ? (
                <tr>
                  <td colSpan={tab === "pending" ? 7 : 6} className="empty-state">
                    {t("emails.empty")}
                  </td>
                </tr>
              ) : (
                emails.map((row) => (
                  <tr key={row.id}>
                    {tab === "pending" && (
                      <td>
                        <input
                          type="checkbox"
                          checked={!!selected[row.id]}
                          onChange={(e) => setSelected((s) => ({ ...s, [row.id]: e.target.checked }))}
                        />
                      </td>
                    )}
                    <td>
                      <div style={{ fontWeight: 500 }}>{row.to_email}</div>
                      <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                        {row.source === "paid" ? t("emails.source.paid") : t("emails.source.free")} · {row.locale} · {row.attempts} {t("emails.attempts")}
                      </div>
                    </td>
                    <td>{t(MODULE_LABELS[row.module] || "") || row.module || "-"}</td>
                    <td style={{ color: "#6b7280" }}>
                      {row.product_name || "-"}
                      <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{row.report_id}</div>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[row.status] || "badge-pending"}`}>
                        {t(`emails.status.${row.status}`)}
                      </span>
                      {row.error && (
                        <div style={{ fontSize: "0.7rem", color: "#b91c1c", maxWidth: "14rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {row.error}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      {safeDateTime(row.created_at)}
                      {row.reviewed_by && (
                        <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                          {t("emails.reviewedBy")}: {row.reviewed_by}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                        <a
                          href={row.reportUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                        >
                          <ExternalLink size={12} /> {t("emails.viewReport")}
                        </a>
                        {(row.status === "pending" || row.status === "approved") && (
                          <>
                            <button
                              className="btn btn-primary"
                              disabled={busy}
                              onClick={() => act("approve", [row.id])}
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                            >
                              <Check size={12} /> {t("emails.approve")}
                            </button>
                            <button
                              className="btn btn-outline"
                              disabled={busy}
                              onClick={() => act("reject", [row.id], window.prompt(t("emails.rejectPrompt")) || undefined)}
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                            >
                              <X size={12} /> {t("emails.reject")}
                            </button>
                          </>
                        )}
                        {row.status === "failed" && (
                          <button
                            className="btn btn-outline"
                            disabled={busy}
                            onClick={() => act("retry", [row.id])}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                          >
                            <RefreshCw size={12} /> {t("emails.retry")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
          <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            {t("emails.prev")}
          </button>
          <span style={{ fontSize: "0.85rem", color: "#6b7280", alignSelf: "center" }}>
            {page} / {totalPages}
          </span>
          <button className="btn btn-outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            {t("emails.next")}
          </button>
        </div>
      )}
    </div>
  );
}
