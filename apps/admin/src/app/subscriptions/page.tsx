"use client";

import { useState, useEffect } from "react";
import { get, post } from "@/lib/api";

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

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addPlan, setAddPlan] = useState("monthly");
  const addUnit = addPlan === "monthly" ? "月" : "年";

  useEffect(() => {
    setLoading(true);
    get<{ subscriptions: Subscription[] }>("/subscriptions")
      .then((data) => setSubscriptions(data.subscriptions))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const changeStatus = async (id: string, status: string) => {
    await post(`/subscriptions/${id}/status`, { status });
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  };

  const handleAddSubscription = async () => {
    if (!addUserId) return;
    await post("/subscriptions", { userId: addUserId, plan: addPlan });
    setShowAdd(false);
    setAddUserId("");
    // Reload
    const data = await get<{ subscriptions: Subscription[] }>("/subscriptions");
    setSubscriptions(data.subscriptions);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>共 {subscriptions.length} 条订阅</span>
        <button className="btn btn-gold" onClick={() => setShowAdd(true)}>
          + 手动添加订阅
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
                  <td colSpan={7} className="empty-state">暂无订阅记录</td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <td style={{ fontWeight: 500 }}>{sub.user_name || "—"}</td>
                    <td style={{ color: "#6b7280" }}>{sub.user_email}</td>
                    <td>{sub.plan}</td>
                    <td>
                      <span className={`badge badge-${sub.status.toLowerCase()}`}>
                        {sub.status === "active" ? "活跃" :
                         sub.status === "past_due" ? "扣款失败" :
                         sub.status === "expired" ? "已过期" :
                         sub.status === "canceled" ? "已取消" : sub.status}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      {sub.current_period_start ? new Date(sub.current_period_start + "Z").toLocaleDateString("zh-CN") : "—"}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      {sub.current_period_end ? new Date(sub.current_period_end + "Z").toLocaleDateString("zh-CN") : "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        {sub.status !== "active" && (
                          <button className="btn btn-primary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                            onClick={() => changeStatus(sub.id, "active")}>
                            激活
                          </button>
                        )}
                        {sub.status !== "canceled" && (
                          <button className="btn btn-outline" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", color: "#dc2626" }}
                            onClick={() => changeStatus(sub.id, "canceled")}>
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
        </div>
      )}

      {/* Add subscription modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>手动添加订阅</h3>
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.375rem" }}>
                用户 ID（user_id）
              </label>
              <input className="input" value={addUserId} onChange={(e) => setAddUserId(e.target.value)} placeholder="输入用户 ID" />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.375rem" }}>
                订阅计划
              </label>
              <select className="select" value={addPlan} onChange={(e) => setAddPlan(e.target.value)}>
                <option value="monthly">月度订阅</option>
                <option value="annual">年度订阅</option>
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button className="btn btn-outline" onClick={() => setShowAdd(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleAddSubscription}>确认添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
