"use client";

import { useState, useEffect } from "react";
import { get } from "@/lib/api"
import { buildAdminT } from "@/lib/i18n";
import { safeDate, safeDateTime } from "@/lib/date";
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

interface Report {
  id: string;
  module: string;
  product_name: string;
  payment_status: string;
  user_email: string;
  user_name: string;
  locale: string;
  created_at: string;
}

const MODULE_LABELS: Record<string, string> = {
  "GACC Food Registration": "module.gacc",
  "Chinese Label Compliance": "module.label",
  "Cosmetics Filing (NMPA)": "module.nmpa",
  "CCC Certification": "module.ccc",
  "Cross-Border E-commerce": "module.crossborder",
  "Brand Protection": "module.trademark",
};

const MODULE_KEYS = Object.keys(MODULE_LABELS);
const STATUS_OPTIONS = ["pending", "completed", "free_with_subscription", "refunded"];

const statusLabel = (s: string) =>
  ({
    pending: "status.pending",
    completed: "status.paid",
    free_with_subscription: "status.free",
    refunded: "status.refunded",
  })[s] || s;

const statusBadge = (s: string) =>
  ({
    pending: "badge-pending",
    completed: "badge-completed",
    free_with_subscription: "badge-free",
    refunded: "badge-refunded",
  })[s] || "badge-pending";

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const t = buildAdminT();
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (moduleFilter) params.set("module", moduleFilter);
    if (statusFilter) params.set("status", statusFilter);
    get<{ reports: Report[]; total: number }>(`/reports?${params.toString()}`)
      .then((data) => {
        setReports(data.reports);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, pageSize, moduleFilter, statusFilter]);

  const totalPages = Math.ceil(total / pageSize);

  const handleFilter = (module: string, status: string) => {
    setModuleFilter(module);
    setStatusFilter(status);
    setPage(1);
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <select
          className="select"
          value={moduleFilter}
          onChange={(e) => handleFilter(e.target.value, statusFilter)}
        >
          <option value="">{t("table.allModules")}</option>
          {MODULE_KEYS.map((m) => (
            <option key={m} value={m}>
              {t(MODULE_LABELS[m])}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={statusFilter}
          onChange={(e) => handleFilter(moduleFilter, e.target.value)}
        >
          <option value="">{t("table.allStatus")}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {t(statusLabel(s))}
            </option>
          ))}
        </select>
        <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>共 {total} 条报告</span>
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
                <th>产品名称</th>
                <th>模块</th>
                <th>用户</th>
                <th>支付状态</th>
                <th>语言</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">
                    暂无报告数据
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id}>
                    <td style={{ fontWeight: 500 }}>{report.product_name}</td>
                    <td>{t(MODULE_LABELS[report.module]) || report.module}</td>
                    <td style={{ color: "#6b7280" }}>
                      {report.user_name
                        ? `${report.user_name} (${report.user_email})`
                        : report.user_email || "未登录用户"}
                    </td>
                    <td>
                      <span className={`badge ${statusBadge(report.payment_status)}`}>
                        {t(statusLabel(report.payment_status))}
                      </span>
                    </td>
                    <td>{report.locale}</td>
                    <td style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      {safeDateTime(report.created_at)}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <a
                          href={`/admin/report-detail?id=${report.id}`}
                          className="btn btn-outline"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                        >
                          详情
                        </a>
                        <a
                          href={`https://sinotradecompliance.com/${report.locale || "en"}/c/report/?id=${report.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                        >
                          <ExternalLink size={12} />
                          原始报告
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft size={14} /> 上一页
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 3, totalPages - 6));
                const p = start + i;
                if (p > totalPages) return null;
                return (
                  <button key={p} className={page === p ? "active" : ""} onClick={() => setPage(p)}>
                    {p}
                  </button>
                );
              })}
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                下一页 <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
