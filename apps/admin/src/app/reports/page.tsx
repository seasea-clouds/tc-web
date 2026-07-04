"use client";

import { useState, useEffect } from "react";
import { get } from "@/lib/api";

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

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      pending: "待支付",
      completed: "已支付",
      free_with_subscription: "订阅免费",
      refunded: "已退款",
    };
    return map[s] || s;
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: "badge-pending",
      completed: "badge-completed",
      free_with_subscription: "badge-free",
      refunded: "badge-refunded",
    };
    return map[s] || "badge-pending";
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", alignItems: "center" }}>
        <select className="select" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
          <option value="">全部模块</option>
          <option value="hs_code">HS Code 查询</option>
          <option value="compliance">合规评估</option>
          <option value="tariff">关税分析</option>
        </select>
        <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">全部状态</option>
          <option value="pending">待支付</option>
          <option value="completed">已支付</option>
          <option value="free_with_subscription">订阅免费</option>
          <option value="refunded">已退款</option>
        </select>
        <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>共 {reports.length} 条报告</span>
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
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-state">暂无报告数据</td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id}>
                    <td style={{ fontWeight: 500 }}>{report.product_name}</td>
                    <td>{report.module}</td>
                    <td style={{ color: "#6b7280" }}>{report.user_email || "未登录用户"}</td>
                    <td>
                      <span className={`badge ${statusBadge(report.payment_status)}`}>
                        {statusLabel(report.payment_status)}
                      </span>
                    </td>
                    <td>{report.locale}</td>
                    <td style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      {new Date(report.created_at + "Z").toLocaleString("zh-CN")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
