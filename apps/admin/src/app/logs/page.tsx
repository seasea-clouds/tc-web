"use client";

import { useState, useEffect } from "react";
import { get } from "@/lib/api";
import { Search, ChevronDown, ChevronUp } from "lucide-react";

interface LogEntry {
  id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_summary: string;
  detail: string;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  login: "登录",
  logout: "登出",
  disable_user: "禁用用户",
  enable_user: "启用用户",
  add_subscription: "添加订阅",
  modify_subscription: "修改订阅",
  cancel_subscription: "取消订阅",
  refund_payment: "发起退款",
};

const ACTION_CATEGORIES: Record<string, string> = {
  login: "认证",
  logout: "认证",
  disable_user: "用户管理",
  enable_user: "用户管理",
  add_subscription: "订阅管理",
  modify_subscription: "订阅管理",
  cancel_subscription: "订阅管理",
  refund_payment: "支付",
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const pageSize = 30;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set("search", search);
    if (actionFilter) params.set("action", actionFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    get<{ logs: LogEntry[]; total: number }>(`/logs?${params.toString()}`)
      .then((data) => {
        setLogs(data.logs);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search, actionFilter, dateFrom, dateTo]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 300 }}>
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input
            className="input"
            style={{ paddingLeft: "2.25rem" }}
            placeholder="搜索操作内容..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="select" value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}>
          <option value="">全部类型</option>
          <optgroup label="🔐 认证">
            <option value="login">登录</option>
            <option value="logout">登出</option>
          </optgroup>
          <optgroup label="👥 用户管理">
            <option value="disable_user">禁用用户</option>
            <option value="enable_user">启用用户</option>
          </optgroup>
          <optgroup label="🔄 订阅管理">
            <option value="add_subscription">添加订阅</option>
            <option value="modify_subscription">修改订阅</option>
            <option value="cancel_subscription">取消订阅</option>
          </optgroup>
          <optgroup label="💳 支付">
            <option value="refund_payment">发起退款</option>
          </optgroup>
        </select>
        <input type="date" className="input" style={{ maxWidth: 160 }} value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
        <span style={{ color: "#9ca3af" }}>至</span>
        <input type="date" className="input" style={{ maxWidth: 160 }} value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
        <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>共 {total} 条</span>
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
                <th style={{ width: 32 }} />
                <th>时间</th>
                <th>操作人</th>
                <th>操作类型</th>
                <th>操作对象</th>
                <th>详情</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-state">暂无操作日志</td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expanded.has(log.id);
                  let detailObj: Record<string, unknown> | null = null;
                  try {
                    detailObj = JSON.parse(log.detail);
                  } catch {}
                  return (
                    <>
                      <tr key={log.id} style={{ cursor: "pointer" }} onClick={() => toggleExpand(log.id)}>
                        <td>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                          {new Date(log.created_at + "Z").toLocaleString("zh-CN")}
                        </td>
                        <td>{log.admin_name || "—"}</td>
                        <td>
                          <span className="badge badge-completed">
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </td>
                        <td style={{ color: "#6b7280", fontSize: "0.8rem" }}>
                          {log.target_summary || "—"}
                        </td>
                        <td>
                          {detailObj ? (
                            <span style={{ color: "#3b82f6", fontSize: "0.8rem" }}>
                              {isExpanded ? "收起" : `${Object.keys(detailObj).length} 项变更`}
                            </span>
                          ) : (
                            <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>无</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && detailObj && (
                        <tr key={`${log.id}-detail`}>
                          <td colSpan={6} style={{ padding: "0.5rem 1rem 0.75rem 2.5rem", background: "#f9fafb" }}>
                            <pre style={{ fontSize: "0.75rem", color: "#374151", whiteSpace: "pre-wrap", fontFamily: "monospace", margin: 0 }}>
                              {JSON.stringify(detailObj, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button>
              <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
