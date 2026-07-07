"use client";

import { useState, useEffect } from "react";
import { get, post } from "@/lib/api";
import { safeDate, safeDateTime } from "@/lib/date";
import { X, ChevronDown, ChevronUp, Eye, ChevronLeft, ChevronRight } from "lucide-react";

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
  ({ active: "活跃", past_due: "扣款失败", expired: "已过期", canceled: "已取消" })[s] || s;

function formatAmount(cents: number, currency: string): string {
  const symbol = currency === "USD" ? "$" : currency === "CNY" ? "¥" : currency + " ";
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addPlan, setAddPlan] = useState("monthly");
  const [addStartDate, setAddStartDate] = useState("");
  const [addEndDate, setAddEndDate] = useState("");

  // Detail panel
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [subDetail, setSubDetail] = useState<SubscriptionDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedPayments, setExpandedPayments] = useState(true);

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
    if (subDetail?.subscription.id === id) {
      setSubDetail((prev) =>
        prev ? { ...prev, subscription: { ...prev.subscription, status } } : null
      );
    }
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

  const openDetail = async (subId: string) => {
    setSelectedSubId(subId);
    setDetailLoading(true);
    setSubDetail(null);
    try {
      const data = await get<SubscriptionDetailData>(`/subscriptions?id=${subId}`);
      setSubDetail(data);
    } catch {
      setSubDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedSubId(null);
    setSubDetail(null);
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
                      onClick={() => openDetail(sub.id)}
                    >
                      <td style={{ fontWeight: 500 }}>{sub.user_name || "—"}</td>
                      <td style={{ color: "#6b7280" }}>{sub.user_email}</td>
                      <td>
                        {sub.plan === "monthly"
                          ? "月度订阅"
                          : sub.plan === "annual"
                          ? "年度订阅"
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
                          <button
                            className="btn btn-outline"
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetail(sub.id);
                            }}
                          >
                            <Eye size={14} />
                          </button>
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

          {/* Detail panel */}
          {detailLoading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
              <div className="spinner" />
            </div>
          )}

          {subDetail && !detailLoading && (
            <div className="card" style={{ marginTop: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                  订阅详情 — {subDetail.subscription.user_name || subDetail.subscription.user_email}
                </h3>
                <button className="btn btn-outline" style={{ padding: "0.25rem 0.5rem" }} onClick={closeDetail}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.5rem", marginBottom: "1rem", padding: "0.75rem", background: "#f9fafb", borderRadius: "0.5rem", fontSize: "0.85rem" }}>
                <div><strong>ID:</strong> <code style={{ fontSize: "0.7rem" }}>{subDetail.subscription.id}</code></div>
                <div><strong>用户:</strong> {subDetail.subscription.user_name || "—"} ({subDetail.subscription.user_email})</div>
                <div><strong>计划:</strong> {subDetail.subscription.plan === "monthly" ? "月度订阅" : "年度订阅"}</div>
                <div>
                  <strong>状态:</strong>{" "}
                  <span className={`badge badge-${subDetail.subscription.status.toLowerCase()}`}>
                    {statusLabel(subDetail.subscription.status)}
                  </span>
                </div>
                <div><strong>Creem ID:</strong> <code style={{ fontSize: "0.7rem" }}>{subDetail.subscription.provider_subscription_id || "—"}</code></div>
                <div><strong>周期开始:</strong> {safeDate(subDetail.subscription.current_period_start)}</div>
                <div><strong>周期结束:</strong> {safeDate(subDetail.subscription.current_period_end)}</div>
                <div><strong>创建时间:</strong> {safeDateTime(subDetail.subscription.created_at)}</div>
                <div>
                  <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.25rem" }}>
                    {subDetail.subscription.status !== "active" && (
                      <button className="btn btn-primary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        onClick={() => changeStatus(subDetail.subscription.id, "active")}>
                        激活
                      </button>
                    )}
                    {subDetail.subscription.status !== "canceled" && (
                      <button className="btn btn-outline" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", color: "#dc2626" }}
                        onClick={() => changeStatus(subDetail.subscription.id, "canceled")}>
                        取消订阅
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment history */}
              {subDetail.payments.length > 0 && (
                <div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", padding: "0.5rem 0", userSelect: "none" }}
                    onClick={() => setExpandedPayments(!expandedPayments)}
                  >
                    {expandedPayments ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <h4 style={{ margin: 0, fontSize: "0.95rem" }}>支付记录 ({subDetail.payments.length})</h4>
                  </div>
                  {expandedPayments && (
                    <div style={{ overflow: "auto" }}>
                      <table className="data-table" style={{ fontSize: "0.8rem" }}>
                        <thead>
                          <tr>
                            <th>交易 ID</th>
                            <th>金额</th>
                            <th>状态</th>
                            <th>时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subDetail.payments.map((p) => (
                            <tr key={p.id}>
                              <td style={{ fontFamily: "monospace", fontSize: "0.7rem" }}>{p.provider_payment_id || p.id.slice(0, 8)}</td>
                              <td style={{ fontWeight: 600 }}>{formatAmount(p.amount_cents, p.currency)}</td>
                              <td>
                                <span className={`badge ${p.status === "completed" ? "badge-completed" : "badge-pending"}`}>
                                  {p.status === "completed" ? "已支付" : p.status}
                                </span>
                              </td>
                              <td>{safeDate(p.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
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
                placeholder="输入用户邮箱"
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
