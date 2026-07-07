"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { get, post } from "@/lib/api";
import { safeDate, safeDateTime } from "@/lib/date";
import { ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";

interface UserDetailData {
  user: {
    id: string;
    email: string;
    name: string;
    locale: string;
    status: string;
    created_at: string;
    report_count: number;
  };
  reports: Array<{
    id: string;
    module: string;
    product_name: string;
    payment_status: string;
    created_at: string;
  }>;
  subscriptions: Array<{
    id: string;
    plan: string;
    status: string;
    provider_subscription_id: string;
    current_period_start: string;
    current_period_end: string;
    created_at: string;
  }>;
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    active: "badge-active",
    disabled: "badge-disabled",
    past_due: "badge-pending",
    expired: "badge-disabled",
    canceled: "badge-pending",
  };
  return map[s] || "badge-pending";
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    active: "正常",
    disabled: "已禁用",
    past_due: "扣款失败",
    expired: "已过期",
    canceled: "已取消",
  };
  return map[s] || s;
};

function UserDetailInner() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("id") || "";

  const [data, setData] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedReports, setExpandedReports] = useState(true);
  const [expandedSubs, setExpandedSubs] = useState(true);
  const [userStatus, setUserStatus] = useState<string>("active");

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    get<UserDetailData>(`/users?id=${userId}`)
      .then((d) => {
        setData(d);
        setUserStatus(d.user.status);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const toggleUserStatus = async () => {
    const newStatus = userStatus === "disabled" ? "active" : "disabled";
    await post(`/users?id=${userId}`, { status: newStatus });
    setUserStatus(newStatus);
    if (data) {
      setData({ ...data, user: { ...data.user, status: newStatus } });
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!userId) {
    return <div className="card"><p>用户 ID 缺失</p></div>;
  }

  if (!data) {
    return <div className="card"><p>用户未找到</p></div>;
  }

  const { user } = data;

  return (
    <div>
      <a
        href="/admin/users"
        style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", color: "#4b5563", marginBottom: "1rem", fontSize: "0.85rem", textDecoration: "none" }}
      >
        <ArrowLeft size={16} /> 返回用户列表
      </a>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>用户详情 — {user.name || user.email}</h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.5rem", marginBottom: "1rem", padding: "0.75rem", background: "#f9fafb", borderRadius: "0.5rem", fontSize: "0.85rem" }}>
          <div><strong>ID:</strong> <code style={{ fontSize: "0.75rem" }}>{user.id}</code></div>
          <div><strong>邮箱:</strong> {user.email}</div>
          <div><strong>姓名:</strong> {user.name || "—"}</div>
          <div><strong>语言:</strong> {user.locale || "en"}</div>
          <div>
            <strong>状态:</strong>{" "}
            <span className={`badge ${userStatus === "disabled" ? "badge-disabled" : "badge-active"}`}>
              {userStatus === "disabled" ? "已禁用" : "活跃"}
            </span>
          </div>
          <div><strong>注册时间:</strong> {safeDateTime(user.created_at)}</div>
          <div><strong>报告总数:</strong> {user.report_count}</div>
          <div>
            <button
              className={`btn ${userStatus === "disabled" ? "btn-primary" : "btn-outline"}`}
              style={{ padding: "0.25rem 0.625rem", fontSize: "0.75rem" }}
              onClick={toggleUserStatus}
            >
              {userStatus === "disabled" ? "启用用户" : "禁用用户"}
            </button>
          </div>
        </div>

        {data.subscriptions.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", padding: "0.5rem 0", userSelect: "none" }}
              onClick={() => setExpandedSubs(!expandedSubs)}
            >
              {expandedSubs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              <h4 style={{ margin: 0, fontSize: "0.95rem" }}>订阅记录 ({data.subscriptions.length})</h4>
            </div>
            {expandedSubs && (
              <div style={{ overflow: "auto" }}>
                <table className="data-table" style={{ fontSize: "0.8rem" }}>
                  <thead>
                    <tr>
                      <th>计划</th>
                      <th>状态</th>
                      <th>Creem ID</th>
                      <th>周期开始</th>
                      <th>周期结束</th>
                      <th>创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.subscriptions.map((sub) => (
                      <tr key={sub.id}>
                        <td>{sub.plan === "monthly" ? "月度订阅" : sub.plan === "annual" ? "年度订阅" : sub.plan}</td>
                        <td><span className={`badge ${statusBadge(sub.status)}`}>{statusLabel(sub.status)}</span></td>
                        <td style={{ fontFamily: "monospace", fontSize: "0.7rem" }}>{sub.provider_subscription_id || "—"}</td>
                        <td>{safeDate(sub.current_period_start)}</td>
                        <td>{safeDate(sub.current_period_end)}</td>
                        <td>{safeDate(sub.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {data.reports.length > 0 && (
          <div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", padding: "0.5rem 0", userSelect: "none" }}
              onClick={() => setExpandedReports(!expandedReports)}
            >
              {expandedReports ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              <h4 style={{ margin: 0, fontSize: "0.95rem" }}>报告记录 ({data.reports.length})</h4>
            </div>
            {expandedReports && (
              <div style={{ overflow: "auto" }}>
                <table className="data-table" style={{ fontSize: "0.8rem" }}>
                  <thead>
                    <tr>
                      <th>模块</th>
                      <th>产品名称</th>
                      <th>支付状态</th>
                      <th>创建时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.reports.map((r) => (
                      <tr key={r.id}>
                        <td>{r.module}</td>
                        <td>{r.product_name || "—"}</td>
                        <td><span className={`badge ${statusBadge(r.payment_status)}`}>{statusLabel(r.payment_status)}</span></td>
                        <td>{safeDate(r.created_at)}</td>
                        <td>
                          <a
                            href={`/admin/report-detail?id=${r.id}`}
                            className="btn btn-outline"
                            style={{ padding: "0.2rem 0.4rem", fontSize: "0.7rem", textDecoration: "none" }}
                          >
                            查看
                          </a>
                        </td>
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

export default function UserDetailPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><div className="spinner" /></div>}>
      <UserDetailInner />
    </Suspense>
  );
}
