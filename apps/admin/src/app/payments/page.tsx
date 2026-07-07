"use client";

import { useState, useEffect } from "react";
import { safeDate } from "@/lib/date";
import { get, post } from "@/lib/api";
import { Search, DollarSign, TrendingUp, Calendar, CreditCard } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";

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

interface RevenueSummary {
  today: { revenue: number; count: number };
  month: { revenue: number; count: number };
  total: { revenue: number; count: number };
  trend: Array<{ month: string; amount: number }>;
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

function formatRevenue(cents: number): string {
  return `¥${(cents / 100).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;
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

  // Revenue summary
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(true);

  const pageSize = 20;
  const [backfilling, setBackfilling] = useState(false);

  const handleBackfill = async () => {
    if (!confirm('确认从已有已完成报告中补录支付记录？')) return;
    setBackfilling(true);
    try {
      const res = await post<{ ok: boolean; found: number; inserted: number; message: string }>('/payments', { action: 'backfill' });
      showToast('success', res.message || `补录完成：${res.inserted}/${res.found}`);
      fetchPayments();
      const rev = await get<RevenueSummary>('/payments/summary');
      setRevenue(rev);
    } catch (err: any) {
      showToast('error', '补录失败: ' + (err.message || err));
    } finally {
      setBackfilling(false);
    }
  };

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

  // Fetch revenue summary
  useEffect(() => {
    setRevenueLoading(true);
    get<RevenueSummary>("/payments/summary")
      .then((data) => setRevenue(data))
      .catch(() => {})
      .finally(() => setRevenueLoading(false));
  }, []);

  const handleRefund = async (paymentId: string) => {
    setRefunding(paymentId);
    try {
      await post(`/payments/${paymentId}/refund`, {});
      showToast("success", "退款成功");
      fetchPayments();
      // Refresh revenue
      const data = await get<RevenueSummary>("/payments/summary");
      setRevenue(data);
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

      {/* Revenue overview */}
      {revenueLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "1rem" }}>
          <div className="spinner" />
        </div>
      ) : revenue && (
        <div style={{ marginBottom: "1.5rem" }}>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "#dbeafe" }}>
                <DollarSign size={20} color="#2563eb" />
              </div>
              <div>
                <div className="stat-label">今日收入</div>
                <div className="stat-value">{formatRevenue(revenue.today.revenue)}</div>
                <div className="stat-sub">{revenue.today.count} 笔交易</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "#dcfce7" }}>
                <Calendar size={20} color="#16a34a" />
              </div>
              <div>
                <div className="stat-label">本月收入</div>
                <div className="stat-value">{formatRevenue(revenue.month.revenue)}</div>
                <div className="stat-sub">{revenue.month.count} 笔交易</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "#fef3c7" }}>
                <TrendingUp size={20} color="#d97706" />
              </div>
              <div>
                <div className="stat-label">累计收入</div>
                <div className="stat-value">{formatRevenue(revenue.total.revenue)}</div>
                <div className="stat-sub">{revenue.total.count} 笔交易</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "#e0e7ff" }}>
                <CreditCard size={20} color="#6366f1" />
              </div>
              <div>
                <div className="stat-label">全部支付</div>
                <div className="stat-value">{total}</div>
                <div className="stat-sub">共计记录</div>
              </div>
            </div>
          </div>

          {/* Monthly revenue trend chart */}
          {revenue.trend.length > 0 && (
            <div className="card" style={{ padding: "1rem", marginBottom: "1rem" }}>
              <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem", fontWeight: 600 }}>
                月度收入趋势
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenue.trend.map((t) => ({ ...t, amountUSD: t.amount / 100 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `¥${v}`} />
                  <Tooltip
                    formatter={(value: unknown) => [`¥${Number(value).toLocaleString()}`, "收入"]}
                    labelFormatter={(label: unknown) => `${label} 月`}
                  />
                  <Bar dataKey="amountUSD" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
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
        <button
          className="btn btn-outline"
          style={{ fontSize: "0.8rem", padding: "0.4rem 0.75rem", whiteSpace: "nowrap" }}
          onClick={handleBackfill}
          disabled={backfilling}
        >
          {backfilling ? "补录中…" : "⬆ 补录支付"}
        </button>
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
                      {safeDate(p.created_at)}
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
