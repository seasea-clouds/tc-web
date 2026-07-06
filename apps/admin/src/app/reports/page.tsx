"use client";

import { useState, useEffect } from "react";
import { get } from "@/lib/api";
import { X, ChevronDown, ChevronUp, FileText, Download } from "lucide-react";

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

interface ReportDetail {
  id: string;
  module: string;
  product_name: string;
  hs_code: string;
  origin_country: string;
  payment_status: string;
  pdf_path: string;
  locale: string;
  user_email: string;
  user_name: string;
  created_at: string;
  input_data: Record<string, string> | null;
  result_data: { result?: Record<string, unknown>; nextSteps?: string[] } | null;
}

const MODULES = ["hs_code", "compliance", "tariff", "gacc", "label", "crossborder", "ccc", "nmpa", "trademark"];
const STATUS_OPTIONS = ["pending", "completed", "free_with_subscription", "refunded"];

const statusLabel = (s: string) => ({
  pending: "待支付",
  completed: "已支付",
  free_with_subscription: "订阅免费",
  refunded: "已退款",
})[s] || s;

const statusBadge = (s: string) => ({
  pending: "badge-pending",
  completed: "badge-completed",
  free_with_subscription: "badge-free",
  refunded: "badge-refunded",
})[s] || "badge-pending";

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Detail panel
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedResult, setExpandedResult] = useState(true);
  const [expandedInput, setExpandedInput] = useState(true);
  const [expandedNext, setExpandedNext] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (moduleFilter) params.set("module", moduleFilter);
    if (statusFilter) params.set("status", statusFilter);
    get<{ reports: Report[] }>(`/reports?${params.toString()}`)
      .then((data) => setReports(data.reports))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [moduleFilter, statusFilter]);

  const openDetail = async (reportId: string) => {
    setDetailLoading(true);
    setSelectedReport(null);
    try {
      const data = await get<ReportDetail>(`/reports?id=${reportId}`);
      setSelectedReport(data);
    } catch {
      setSelectedReport(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // Render result data key-value pairs
  const renderResult = (obj: Record<string, unknown> | null, depth = 0) => {
    if (!obj) return <span style={{ color: "#9ca3af" }}>—</span>;
    if (typeof obj === "string") return <span>{obj}</span>;

    return (
      <div style={{ paddingLeft: depth > 0 ? "1rem" : 0 }}>
        {Object.entries(obj).map(([key, value]) => (
          <div key={key} style={{ marginBottom: "0.25rem" }}>
            <span style={{ fontWeight: 500, color: "#374151", fontSize: "0.8rem" }}>
              {key.replace(/_/g, " ")}:
            </span>{" "}
            {typeof value === "object" && value !== null
              ? renderResult(value as Record<string, unknown>, depth + 1)
              : <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>{String(value)}</span>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <select className="select" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
          <option value="">全部模块</option>
          {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">全部状态</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>共 {reports.length} 条报告</span>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          {/* Report table */}
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
                    <td colSpan={7} className="empty-state">暂无报告数据</td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr
                      key={report.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => openDetail(report.id)}
                    >
                      <td style={{ fontWeight: 500 }}>{report.product_name}</td>
                      <td>{report.module}</td>
                      <td style={{ color: "#6b7280" }}>
                        {report.user_name ? `${report.user_name} (${report.user_email})` : report.user_email || "未登录用户"}
                      </td>
                      <td>
                        <span className={`badge ${statusBadge(report.payment_status)}`}>
                          {statusLabel(report.payment_status)}
                        </span>
                      </td>
                      <td>{report.locale}</td>
                      <td style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                        {new Date(report.created_at + "Z").toLocaleString("zh-CN")}
                      </td>
                      <td>
                        <button
                          className="btn btn-outline"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                          onClick={(e) => { e.stopPropagation(); openDetail(report.id); }}
                        >
                          <FileText size={14} style={{ marginRight: "0.25rem" }} />
                          预览
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Detail panel overlay */}
          {detailLoading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
              <div className="spinner" />
            </div>
          )}

          {selectedReport && !detailLoading && (
            <div className="card" style={{ marginTop: "1.5rem" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                  报告详情 — {selectedReport.product_name || selectedReport.id.slice(0, 8)}
                </h3>
                <button
                  className="btn btn-outline"
                  style={{ padding: "0.25rem 0.5rem" }}
                  onClick={() => setSelectedReport(null)}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Meta info */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.5rem", marginBottom: "1rem", padding: "0.75rem", background: "#f9fafb", borderRadius: "0.5rem", fontSize: "0.85rem" }}>
                <div><strong>报告 ID:</strong> <code style={{ fontSize: "0.75rem" }}>{selectedReport.id}</code></div>
                <div><strong>模块:</strong> {selectedReport.module}</div>
                <div><strong>产品名称:</strong> {selectedReport.product_name || "—"}</div>
                <div><strong>HS Code:</strong> {selectedReport.hs_code || "—"}</div>
                <div><strong>原产国:</strong> {selectedReport.origin_country || "—"}</div>
                <div><strong>支付状态:</strong> <span className={`badge ${statusBadge(selectedReport.payment_status)}`}>{statusLabel(selectedReport.payment_status)}</span></div>
                <div><strong>用户:</strong> {selectedReport.user_name ? `${selectedReport.user_name} (${selectedReport.user_email})` : selectedReport.user_email || "—"}</div>
                <div><strong>语言:</strong> {selectedReport.locale}</div>
                <div><strong>创建时间:</strong> {new Date(selectedReport.created_at + "Z").toLocaleString("zh-CN")}</div>
              </div>

              {/* Input data section */}
              {selectedReport.input_data && Object.keys(selectedReport.input_data).length > 0 && (
                <div style={{ marginBottom: "1rem" }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", padding: "0.5rem 0", userSelect: "none" }}
                    onClick={() => setExpandedInput(!expandedInput)}
                  >
                    {expandedInput ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <h4 style={{ margin: 0, fontSize: "0.95rem" }}>输入数据</h4>
                  </div>
                  {expandedInput && (
                    <div style={{ padding: "0.75rem", background: "#f9fafb", borderRadius: "0.5rem", fontSize: "0.85rem" }}>
                      {renderResult(selectedReport.input_data as Record<string, unknown>)}
                    </div>
                  )}
                </div>
              )}

              {/* Result data section */}
              {selectedReport.result_data && (
                <div style={{ marginBottom: "1rem" }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", padding: "0.5rem 0", userSelect: "none" }}
                    onClick={() => setExpandedResult(!expandedResult)}
                  >
                    {expandedResult ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <h4 style={{ margin: 0, fontSize: "0.95rem" }}>评估结果</h4>
                  </div>
                  {expandedResult && (
                    <div style={{ padding: "0.75rem", background: "#f0fdf4", borderRadius: "0.5rem", fontSize: "0.85rem" }}>
                      {selectedReport.result_data.result
                        ? renderResult(selectedReport.result_data.result as Record<string, unknown>)
                        : renderResult(selectedReport.result_data as unknown as Record<string, unknown>)}
                    </div>
                  )}
                </div>
              )}

              {/* Next Steps section */}
              {selectedReport.result_data?.nextSteps && selectedReport.result_data.nextSteps.length > 0 && (
                <div style={{ marginBottom: "1rem" }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", padding: "0.5rem 0", userSelect: "none" }}
                    onClick={() => setExpandedNext(!expandedNext)}
                  >
                    {expandedNext ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <h4 style={{ margin: 0, fontSize: "0.95rem" }}>Next Steps</h4>
                  </div>
                  {expandedNext && (
                    <ol style={{ paddingLeft: "1.5rem", margin: 0 }}>
                      {selectedReport.result_data.nextSteps.map((step, i) => (
                        <li key={i} style={{ marginBottom: "0.25rem", fontSize: "0.85rem" }}>{step}</li>
                      ))}
                    </ol>
                  )}
                </div>
              )}

              {/* PDF download (on-the-fly generation, no R2 needed) */}
              <div style={{ marginTop: "1rem" }}>
                <a
                  href={`/api/admin/reports-pdf?id=${selectedReport.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <Download size={16} />
                  下载 PDF
                </a>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
