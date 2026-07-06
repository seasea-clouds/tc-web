"use client";

import { useState, useEffect } from "react";
import { get, post } from "@/lib/api";
import { Search, X, ChevronDown, ChevronUp, Eye, ExternalLink } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  locale: string;
  status: string;
  created_at: string;
  report_count: number;
  subscription_status: string;
}

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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  // Detail panel
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedReports, setExpandedReports] = useState(true);
  const [expandedSubs, setExpandedSubs] = useState(true);

  useEffect(() => {
    setLoading(true);
    get<{ users: User[]; total: number }>(`/users?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`)
      .then((data) => {
        setUsers(data.users);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search]);

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "disabled" ? "active" : "disabled";
    await post(`/users?id=${userId}`, { status: newStatus });
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
    );
    // Also update open detail if viewing this user
    if (userDetail?.user.id === userId) {
      setUserDetail((prev) => prev ? { ...prev, user: { ...prev.user, status: newStatus } } : null);
    }
  };

  const openDetail = async (userId: string) => {
    setSelectedUserId(userId);
    setDetailLoading(true);
    setUserDetail(null);
    try {
      const data = await get<UserDetailData>(`/users?id=${userId}`);
      setUserDetail(data);
    } catch {
      setUserDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedUserId(null);
    setUserDetail(null);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Search bar */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input
            className="input"
            style={{ paddingLeft: "2.25rem" }}
            placeholder="搜索邮箱或姓名..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>共 {total} 个用户</span>
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
                  <th>姓名</th>
                  <th>邮箱</th>
                  <th>注册时间</th>
                  <th>状态</th>
                  <th>报告数</th>
                  <th>订阅状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-state">暂无用户数据</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => openDetail(user.id)}
                    >
                      <td style={{ fontWeight: 500 }}>{user.name || "—"}</td>
                      <td style={{ color: "#6b7280" }}>{user.email}</td>
                      <td style={{ color: "#6b7280", fontSize: "0.8rem" }}>
                        {new Date(user.created_at + "Z").toLocaleDateString("zh-CN")}
                      </td>
                      <td>
                        <span className={`badge ${user.status === "disabled" ? "badge-disabled" : "badge-active"}`}>
                          {user.status === "disabled" ? "已禁用" : "正常"}
                        </span>
                      </td>
                      <td>{user.report_count}</td>
                      <td>
                        {user.subscription_status ? (
                          <span className={`badge badge-${user.subscription_status.toLowerCase()}`}>
                            {user.subscription_status === "active" ? "活跃" : user.subscription_status}
                          </span>
                        ) : (
                          <span style={{ color: "#9ca3af" }}>无</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.375rem" }}>
                          <button
                            className="btn btn-outline"
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                            onClick={(e) => { e.stopPropagation(); openDetail(user.id); }}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className={`btn ${user.status === "disabled" ? "btn-primary" : "btn-outline"}`}
                            style={{ padding: "0.25rem 0.625rem", fontSize: "0.75rem" }}
                            onClick={(e) => { e.stopPropagation(); toggleUserStatus(user.id, user.status); }}
                          >
                            {user.status === "disabled" ? "启用" : "禁用"}
                          </button>
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

          {/* Detail panel */}
          {detailLoading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
              <div className="spinner" />
            </div>
          )}

          {userDetail && !detailLoading && (
            <div className="card" style={{ marginTop: "1.5rem" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                  用户详情 — {userDetail.user.name || userDetail.user.email}
                </h3>
                <button className="btn btn-outline" style={{ padding: "0.25rem 0.5rem" }} onClick={closeDetail}>
                  <X size={16} />
                </button>
              </div>

              {/* User info */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.5rem", marginBottom: "1rem", padding: "0.75rem", background: "#f9fafb", borderRadius: "0.5rem", fontSize: "0.85rem" }}>
                <div><strong>ID:</strong> <code style={{ fontSize: "0.75rem" }}>{userDetail.user.id}</code></div>
                <div><strong>邮箱:</strong> {userDetail.user.email}</div>
                <div><strong>姓名:</strong> {userDetail.user.name || "—"}</div>
                <div><strong>语言:</strong> {userDetail.user.locale || "en"}</div>
                <div>
                  <strong>状态:</strong>{" "}
                  <span className={`badge ${userDetail.user.status === "disabled" ? "badge-disabled" : "badge-active"}`}>
                    {userDetail.user.status === "disabled" ? "已禁用" : "活跃"}
                  </span>
                </div>
                <div><strong>注册时间:</strong> {new Date(userDetail.user.created_at + "Z").toLocaleString("zh-CN")}</div>
                <div><strong>报告总数:</strong> {userDetail.user.report_count}</div>
                <div>
                  <button
                    className={`btn ${userDetail.user.status === "disabled" ? "btn-primary" : "btn-outline"}`}
                    style={{ padding: "0.25rem 0.625rem", fontSize: "0.75rem" }}
                    onClick={() => toggleUserStatus(userDetail.user.id, userDetail.user.status)}
                  >
                    {userDetail.user.status === "disabled" ? "启用用户" : "禁用用户"}
                  </button>
                </div>
              </div>

              {/* Subscriptions section */}
              {userDetail.subscriptions.length > 0 && (
                <div style={{ marginBottom: "1rem" }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", padding: "0.5rem 0", userSelect: "none" }}
                    onClick={() => setExpandedSubs(!expandedSubs)}
                  >
                    {expandedSubs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <h4 style={{ margin: 0, fontSize: "0.95rem" }}>订阅记录 ({userDetail.subscriptions.length})</h4>
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
                          {userDetail.subscriptions.map((sub) => (
                            <tr key={sub.id}>
                              <td>{sub.plan}</td>
                              <td><span className={`badge ${statusBadge(sub.status)}`}>{statusLabel(sub.status)}</span></td>
                              <td style={{ fontFamily: "monospace", fontSize: "0.7rem" }}>{sub.provider_subscription_id || "—"}</td>
                              <td>{sub.current_period_start || "—"}</td>
                              <td>{sub.current_period_end || "—"}</td>
                              <td>{new Date(sub.created_at + "Z").toLocaleDateString("zh-CN")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Reports section */}
              {userDetail.reports.length > 0 && (
                <div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", padding: "0.5rem 0", userSelect: "none" }}
                    onClick={() => setExpandedReports(!expandedReports)}
                  >
                    {expandedReports ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <h4 style={{ margin: 0, fontSize: "0.95rem" }}>报告记录 ({userDetail.reports.length})</h4>
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
                          </tr>
                        </thead>
                        <tbody>
                          {userDetail.reports.map((r) => (
                            <tr key={r.id}>
                              <td>{r.module}</td>
                              <td>{r.product_name || "—"}</td>
                              <td><span className={`badge ${statusBadge(r.payment_status)}`}>{statusLabel(r.payment_status)}</span></td>
                              <td>{new Date(r.created_at + "Z").toLocaleDateString("zh-CN")}</td>
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
    </div>
  );
}
