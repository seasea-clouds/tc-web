"use client";

import { useState, useEffect } from "react";
import { get, post } from "@/lib/api";
import { Search } from "lucide-react";

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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

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
    await post(`/users/${userId}/status`, { status: newStatus });
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
    );
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
                  <tr key={user.id}>
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
                      <button
                        className={`btn ${user.status === "disabled" ? "btn-primary" : "btn-outline"}`}
                        style={{ padding: "0.25rem 0.625rem", fontSize: "0.75rem" }}
                        onClick={() => toggleUserStatus(user.id, user.status)}
                      >
                        {user.status === "disabled" ? "启用" : "禁用"}
                      </button>
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
