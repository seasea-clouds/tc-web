"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { get } from "@/lib/api"
import { buildAdminT } from "@/lib/i18n";
import { safeDateTime } from "@/lib/date";
import { ChevronDown, ChevronUp, Download, ExternalLink, ArrowLeft } from "lucide-react";

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

const MODULE_LABELS: Record<string, string> = {
  "GACC Food Registration": "module.gacc",
  "Chinese Label Compliance": "module.label",
  "Cosmetics Filing (NMPA)": "module.nmpa",
  "CCC Certification": "module.ccc",
  "Cross-Border E-commerce": "module.crossborder",
  "Brand Protection": "module.trademark",
};

const statusLabel = (s: string) =>
  ({ pending: "待支付", completed: "已支付", free_with_subscription: "订阅免费", refunded: "已退款" })[s] || s;

const statusBadge = (s: string) =>
  ({ pending: "badge-pending", completed: "badge-completed", free_with_subscription: "badge-free", refunded: "badge-refunded" })[s] || "badge-pending";

function renderResult(obj: Record<string, unknown> | null, depth = 0): React.ReactNode {
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
}

function ReportDetailInner() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("id") || "";

  const t = buildAdminT();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedInput, setExpandedInput] = useState(true);
  const [expandedResult, setExpandedResult] = useState(true);
  const [expandedNext, setExpandedNext] = useState(true);

  useEffect(() => {
    if (!reportId) {
      setLoading(false);
      return;
    }
    get<ReportDetail>(`/reports?id=${reportId}`)
      .then((data) => setReport(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reportId]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!reportId) {
    return <div className="card"><p>报告 ID 缺失</p></div>;
  }

  if (!report) {
    return <div className="card"><p>报告未找到</p></div>;
  }

  return (
    <div>
      <a
        href="/admin/reports"
        style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", color: "#4b5563", marginBottom: "1rem", fontSize: "0.85rem", textDecoration: "none" }}
      >
        <ArrowLeft size={16} /> 返回报告列表
      </a>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
            报告详情 — {report.product_name || report.id.slice(0, 8)}
          </h3>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <a
              href={`https://sinotradecompliance.com/${report.locale || "en"}/c/report/?id=${report.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.75rem", fontSize: "0.8rem", textDecoration: "none" }}
            >
              <ExternalLink size={14} /> 查看原始报告
            </a>
            <a
              href={`/api/admin/reports-pdf?id=${report.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.75rem", fontSize: "0.8rem", textDecoration: "none" }}
            >
              <Download size={14} /> 下载 PDF
            </a>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.5rem", marginBottom: "1rem", padding: "0.75rem", background: "#f9fafb", borderRadius: "0.5rem", fontSize: "0.85rem" }}>
          <div><strong>报告 ID:</strong> <code style={{ fontSize: "0.75rem" }}>{report.id}</code></div>
          <div><strong>模块:</strong> {MODULE_LABELS[report.module] || report.module}</div>
          <div><strong>产品名称:</strong> {report.product_name || "—"}</div>
          <div><strong>HS Code:</strong> {report.hs_code || "—"}</div>
          <div><strong>原产国:</strong> {report.origin_country || "—"}</div>
          <div>
            <strong>支付状态:</strong>{" "}
            <span className={`badge ${statusBadge(report.payment_status)}`}>{statusLabel(report.payment_status)}</span>
          </div>
          <div><strong>用户:</strong> {report.user_name ? `${report.user_name} (${report.user_email})` : report.user_email || "—"}</div>
          <div><strong>语言:</strong> {report.locale}</div>
          <div><strong>创建时间:</strong> {safeDateTime(report.created_at)}</div>
        </div>

        {report.input_data && Object.keys(report.input_data).length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", padding: "0.5rem 0", userSelect: "none" }}
              onClick={() => setExpandedInput(!expandedInput)}>
              {expandedInput ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              <h4 style={{ margin: 0, fontSize: "0.95rem" }}>输入数据</h4>
            </div>
            {expandedInput && (
              <div style={{ padding: "0.75rem", background: "#f9fafb", borderRadius: "0.5rem", fontSize: "0.85rem" }}>
                {renderResult(report.input_data as Record<string, unknown>)}
              </div>
            )}
          </div>
        )}

        {report.result_data && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", padding: "0.5rem 0", userSelect: "none" }}
              onClick={() => setExpandedResult(!expandedResult)}>
              {expandedResult ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              <h4 style={{ margin: 0, fontSize: "0.95rem" }}>评估结果</h4>
            </div>
            {expandedResult && (
              <div style={{ padding: "0.75rem", background: "#f0fdf4", borderRadius: "0.5rem", fontSize: "0.85rem" }}>
                {report.result_data.result
                  ? renderResult(report.result_data.result as Record<string, unknown>)
                  : renderResult(report.result_data as unknown as Record<string, unknown>)}
              </div>
            )}
          </div>
        )}

        {report.result_data?.nextSteps && report.result_data.nextSteps.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", padding: "0.5rem 0", userSelect: "none" }}
              onClick={() => setExpandedNext(!expandedNext)}>
              {expandedNext ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              <h4 style={{ margin: 0, fontSize: "0.95rem" }}>Next Steps</h4>
            </div>
            {expandedNext && (
              <ol style={{ paddingLeft: "1.5rem", margin: 0 }}>
                {report.result_data.nextSteps.map((step, i) => (
                  <li key={i} style={{ marginBottom: "0.25rem", fontSize: "0.85rem" }}>{step}</li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportDetailPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><div className="spinner" /></div>}>
      <ReportDetailInner />
    </Suspense>
  );
}
