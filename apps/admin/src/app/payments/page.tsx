"use client";

import { useState, useEffect } from "react";
import { get, post } from "@/lib/api";
import { Search } from "lucide-react";

interface Payment {
  id: string;
  report_id: string;
  user_email: string;
  amount_cents: number;
  currency: string;
  status: string;
  provider: string;
  provider_payment_id: string;
  provider_subscription_id: string;
  refunded_at: string;
  created_at: string;
  product_name: string;
  report_module: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "pending", label: "待支付" },
  { value: "completed", label: "已支付" },
  { value: "refunded", label: "已退款" },
];

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-pending",
  completed: "badge-completed",
  refunded: "badge-refunded",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "待支付",
  completed: "已支付",
  refunded: "已退款",
};

function formatAmount(cents: number, currency: string): string {
  const symbol = currency === "USD" ? "$" : currency === "CNY" ? "¥" : currency + " ";
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const pageSize = 20;

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPayments = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("pageSize", pageSize.toString());
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);

    get<{ payments: Payment[]; total: number }>(`/payments?${params.toString()}`)
      .then((data) => {
        setPayments(data.payments);
        setTotal(data.total);
      })
      .catch(() => showToast("error", "加载失败"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPayments();
  }, [page, search, statusFilter]);

  const handleRefund = async (paymentId: string) => {
    setRefunding(paymentId);
    try {
      await post(`/payments/${paymentId}/refund`, {});
      showToast("success", "退款成功");
      fetchPayments();
    } catch {
      showToast("error", "退款失败");
    } finally {
      setRefunding(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      {/* Filters bar */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input
            className="input"
            style={{ paddingLeft: "2.25rem" }}
            placeholder="搜索邮箱、订单号或产品..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>共 {total} 条记录</span>
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
                <th>订单号</th>
                <th>用户</th>
                <th>产品</th>
                <th>金额</th>
                <th>状态</th>
                <th>支付方式</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-state">暂无支付记录</td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontSize: "0.8rem", fontFamily: "monospace", color: "#6b7280", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.id.slice(0, 8)}...
                    </td>
                    <td style={{ color: "#6b7280" }}>{p.user_email}</td>
                    <td style={{ fontSize: "0.8rem" }}>{p.product_name || p.report_module || "—"}</td>
                    <td style={{ fontWeight: 600 }}>{formatAmount(p.amount_cents, p.currency)}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[p.status] || "badge-pending"}`}>
                        {STATUS_LABEL[p.status] || p.status}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "#6b7280" }}>{p.provider}</td>
                    <td style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      {new Date(p.created_at + "Z").toLocaleDateString("zh-CN")}
                    </td>
                    <td>
                      {p.status === "completed" ? (
                        <button
                          className="btn btn-outline"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", color: "#dc2626" }}
                          onClick={() => handleRefund(p.id)}
                          disabled={refunding === p.id}
                        >
                          {refunding === p.id ? "处理中..." : "退款"}
                        </button>
                      ) : (
                        <span style={{ color: "#9ca3af", fontSize: "0.75rem" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, page - 2);
                const p = start + i;
                if (p > totalPages) return null;
                return (
                  <button key={p} className={page === p ? "active" : ""} onClick={() => setPage(p)}>
                    {p}
                  </button>
                );
              })}
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
