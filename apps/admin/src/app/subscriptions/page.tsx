"use client";

import { useState, useEffect } from "react";
import { get, post } from "@/lib/api";
import { safeDate, safeDateTime } from "@/lib/date";
import { X, ChevronDown, ChevronUp, Eye, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { buildAdminT } from "@/lib/i18n";

interface Subscription {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  plan: string;
  status: string;
  provider_subscription_id: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
}

interface SubscriptionDetailData {
  subscription: Subscription;
  payments: Array<{
    id: string;
    amount_cents: number;
    currency: string;
    status: string;
    provider_payment_id: string;
    created_at: string;
  }>;
}

const statusLabel = (s: string) =>
  ({ active: "status.activeShort", past_due: "status.pastDue", expired: "status.expired", canceled: "status.canceled" })[s] || s;

function formatAmount(cents: number, currency: string): string {
  const symbol = currency === "USD" ? "$" : currency === "CNY" ? "¥" : currency + " ";
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const t = buildAdminT();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addPlan, setAddPlan] = useState("monthly");
  const [addStartDate, setAddStartDate] = useState("");
  const [addEndDate, setAddEndDate] = useState("");



  useEffect(() => {
    setLoading(true);
    get<{ subscriptions: Subscription[]; total: number }>(
      `/subscriptions?page=${page}&pageSize=${pageSize}`
    )
      .then((data) => {
        setSubscriptions(data.subscriptions);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  const changeStatus = async (id: string, status: string) => {
    await post(`/subscriptions?id=${id}`, { status });
    setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  const handleAddSubscription = async () => {
    if (!addEmail || !addStartDate || !addEndDate) return;
    await post("/subscriptions", {
      email: addEmail,
      plan: addPlan,
      startDate: addStartDate,
      endDate: addEndDate,
    });
    setShowAdd(false);
    setAddEmail("");
    setAddStartDate("");
    setAddEndDate("");
    const data = await get<{ subscriptions: Subscription[]; total: number }>(
      `/subscriptions?page=${page}&pageSize=${pageSize}`
    );
    setSubscriptions(data.subscriptions);
    setTotal(data.total);
  };



  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>共 {total} 条订阅</span>
        <button className="btn btn-gold" onClick={() => setShowAdd(true)}>
          + 手动添加订阅
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>用户</th>
                  <th>邮箱</th>
                  <th>计划</th>
                  <th>状态</th>
                  <th>周期开始</th>
                  <th>周期结束</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      暂无订阅记录
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr
                      key={sub.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => window.location.href = `/admin/subscription-detail?id=${encodeURIComponent(sub.id)}`}
                    >
                      <td style={{ fontWeight: 500 }}>{sub.user_name || "—"}</td>
                      <td style={{ color: "#6b7280" }}>{sub.user_email}</td>
                      <td>
                        {sub.plan === "monthly"
                          ? t("subscription.monthly")
                          : sub.plan === "annual"
                          ? t("subscription.yearly")
                          : sub.plan}
                      </td>
                      <td>
                        <span className={`badge badge-${sub.status.toLowerCase()}`}>
                          {statusLabel(sub.status)}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                        {safeDate(sub.current_period_start)}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                        {safeDate(sub.current_period_end)}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <a
                            href={`/admin/subscription-detail?id=${encodeURIComponent(sub.id)}`}
                            className="btn btn-outline"
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", textDecoration: "none" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye size={14} />
                          </a>
                          {sub.status !== "active" && (
                            <button
                              className="btn btn-primary"
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                changeStatus(sub.id, "active");
                              }}
                            >
                              激活
                            </button>
                          )}
                          {sub.status !== "canceled" && (
                            <button
                              className="btn btn-outline"
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", color: "#dc2626" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                changeStatus(sub.id, "canceled");
                              }}
                            >
                              取消
                            </button>
                          )}
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

          {/* Dedicated detail page link */}
          {subscriptions.length > 0 && (
            <div style={{ textAlign: "center", padding: "0.75rem", borderTop: "1px solid #e5e7eb", fontSize: "0.85rem", color: "#6b7280" }}>
              点击行或 <Eye size={12} style={{ verticalAlign: "middle" }} /> 按钮查看详情
            </div>
          )}
        </>
      )}

      {/* Add subscription modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>手动添加订阅</h3>
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.375rem" }}>
                用户邮箱
              </label>
              <input
                className="input"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder={t("table.inputUserEmail")}
              />
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.375rem" }}>
                周期开始日期
              </label>
              <input
                className="input"
                type="date"
                value={addStartDate}
                onChange={(e) => setAddStartDate(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.375rem" }}>
                周期结束日期
              </label>
              <input
                className="input"
                type="date"
                value={addEndDate}
                onChange={(e) => setAddEndDate(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.375rem" }}>
                订阅计划
              </label>
              <select className="select" value={addPlan} onChange={(e) => setAddPlan(e.target.value)}>
                <option value="monthly">月度订阅</option>
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button className="btn btn-outline" onClick={() => setShowAdd(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleAddSubscription}>
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
