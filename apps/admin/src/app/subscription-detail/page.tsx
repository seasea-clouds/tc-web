"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { get, post } from "@/lib/api";
import { safeDate, safeDateTime } from "@/lib/date";
import { ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";

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

interface Payment {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  provider_payment_id: string;
  created_at: string;
}

interface SubscriptionDetailData {
  subscription: Subscription;
  payments: Payment[];
}

const statusLabel = (s: string) =>
  ({ active: "活跃", past_due: "扣款失败", expired: "已过期", canceled: "已取消" })[s] || s;

function formatAmount(cents: number, currency: string): string {
  const symbol = currency === "USD" ? "$" : currency === "CNY" ? "¥" : currency + " ";
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

function SubscriptionDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams?.get("id") || "";
  const [subDetail, setSubDetail] = useState<SubscriptionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedPayments, setExpandedPayments] = useState(true);

  useEffect(() => {
    if (!id) {
      setError("缺少订阅 ID");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    get<SubscriptionDetailData>(`/subscriptions?id=${encodeURIComponent(id)}`)
      .then((data) => {
        setSubDetail(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "无法加载订阅详情");
        setLoading(false);
      });
  }, [id]);

  const changeStatus = async (sid: string, status: string) => {
    try {
      await post(`/subscriptions?id=${sid}`, { status });
      setSubDetail((prev) =>
        prev ? { ...prev, subscription: { ...prev.subscription, status } } : null
      );
    } catch (err: any) {
      alert("操作失败: " + (err.message || err));
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
        <p style={{ color: "#dc2626", marginBottom: "1rem" }}>{error}</p>
        <a href="/admin/subscriptions" className="btn btn-outline">
          &larr; 返回订阅管理
        </a>
      </div>
    );
  }

  if (!subDetail) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
        <p style={{ color: "#6b7280", marginBottom: "1rem" }}>未找到订阅</p>
        <a href="/admin/subscriptions" className="btn btn-outline">
          &larr; 返回订阅管理
        </a>
      </div>
    );
  }

  const sub = subDetail.subscription;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <a href="/admin/subscriptions" className="btn btn-outline" style={{ padding: "0.375rem 0.75rem", fontSize: "0.85rem" }}>
          <ArrowLeft size={16} style={{ marginRight: "0.25rem", verticalAlign: "middle" }} />
          返回
        </a>
        <h2 style={{ margin: 0, fontSize: "1.25rem" }}>
          订阅详情 — {sub.user_name || sub.user_email}
        </h2>
        <span className={`badge badge-${sub.status.toLowerCase()}`}>
          {statusLabel(sub.status)}
        </span>
      </div>

      <div className="card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ padding: "0.75rem", background: "#f9fafb", borderRadius: "0.5rem", fontSize: "0.85rem" }}>
            <div style={{ color: "#6b7280", fontSize: "0.75rem", marginBottom: "0.25rem" }}>订阅 ID</div>
            <code style={{ fontSize: "0.7rem", wordBreak: "break-all" }}>{sub.id}</code>
          </div>
          <div style={{ padding: "0.75rem", background: "#f9fafb", borderRadius: "0.5rem", fontSize: "0.85rem" }}>
            <div style={{ color: "#6b7280", fontSize: "0.75rem", marginBottom: "0.25rem" }}>用户信息</div>
            <div><strong>{sub.user_name || "—"}</strong></div>
            <div style={{ color: "#6b7280", fontSize: "0.8rem" }}>{sub.user_email}</div>
          </div>
          <div style={{ padding: "0.75rem", background: "#f9fafb", borderRadius: "0.5rem", fontSize: "0.85rem" }}>
            <div style={{ color: "#6b7280", fontSize: "0.75rem", marginBottom: "0.25rem" }}>订阅计划</div>
            <div>{sub.plan === "monthly" ? "月度订阅" : sub.plan === "annual" ? "年度订阅" : sub.plan}</div>
          </div>
          <div style={{ padding: "0.75rem", background: "#f9fafb", borderRadius: "0.5rem", fontSize: "0.85rem" }}>
            <div style={{ color: "#6b7280", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Creem 订阅 ID</div>
            <code style={{ fontSize: "0.7rem", wordBreak: "break-all" }}>{sub.provider_subscription_id || "—"}</code>
          </div>
          <div style={{ padding: "0.75rem", background: "#f9fafb", borderRadius: "0.5rem", fontSize: "0.85rem" }}>
            <div style={{ color: "#6b7280", fontSize: "0.75rem", marginBottom: "0.25rem" }}>周期</div>
            <div>{safeDate(sub.current_period_start)} → {safeDate(sub.current_period_end)}</div>
          </div>
          <div style={{ padding: "0.75rem", background: "#f9fafb", borderRadius: "0.5rem", fontSize: "0.85rem" }}>
            <div style={{ color: "#6b7280", fontSize: "0.75rem", marginBottom: "0.25rem" }}>创建时间</div>
            <div>{safeDateTime(sub.created_at)}</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {sub.status !== "active" && (
            <button className="btn btn-primary" onClick={() => changeStatus(sub.id, "active")}>
              激活
            </button>
          )}
          {sub.status !== "canceled" && (
            <button
              className="btn btn-outline"
              style={{ color: "#dc2626", borderColor: "#dc2626" }}
              onClick={() => changeStatus(sub.id, "canceled")}
            >
              取消订阅
            </button>
          )}
        </div>

        {/* Payment history */}
        {subDetail.payments.length > 0 && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                padding: "0.5rem 0",
                userSelect: "none",
                borderTop: "1px solid #e5e7eb",
              }}
              onClick={() => setExpandedPayments(!expandedPayments)}
            >
              {expandedPayments ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              <h4 style={{ margin: 0, fontSize: "0.95rem" }}>
                支付记录 ({subDetail.payments.length})
              </h4>
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
                        <td style={{ fontFamily: "monospace", fontSize: "0.7rem" }}>
                          {p.provider_payment_id || p.id.slice(0, 8)}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {formatAmount(p.amount_cents, p.currency)}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              p.status === "completed" ? "badge-completed" : "badge-pending"
                            }`}
                          >
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
    </div>
  );
}

export default function SubscriptionDetailPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="spinner" />
        </div>
      }
    >
      <SubscriptionDetailContent />
    </Suspense>
  );
}
