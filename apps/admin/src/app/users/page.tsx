"use client";

import { useState, useEffect } from "react";
import { get, post } from "@/lib/api";
import { safeDate, safeDateTime } from "@/lib/date";
import { Search, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { buildAdminT } from "@/lib/i18n";

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
    active: "status.active",
    disabled: "status.disabled",
    past_due: "status.pastDue",
    expired: "status.expired",
    canceled: "status.canceled",
  };
  return map[s] || s;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const t = buildAdminT();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    get<{ users: User[]; total: number }>(
      `/users?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`
    )
      .then((data) => {
        setUsers(data.users);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, pageSize, search]);

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "disabled" ? "active" : "disabled";
    await post(`/users?id=${userId}`, { status: newStatus });
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
          <Search
            size={16}
            style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}
          />
          <input
            className="input"
            style={{ paddingLeft: "2.25rem" }}
            placeholder={t("table.searchEmail")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
                  <td colSpan={7} className="empty-state">
                    暂无用户数据
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 500 }}>{user.name || "—"}</td>
                    <td style={{ color: "#6b7280" }}>{user.email}</td>
                    <td style={{ color: "#6b7280", fontSize: "0.8rem" }}>
                      {safeDate(user.created_at)}
                    </td>
                    <td>
                      <span className={`badge ${user.status === "disabled" ? "badge-disabled" : "badge-active"}`}>
                        {user.status === "disabled" ? t("status.disabled") : t("status.active")}
                      </span>
                    </td>
                    <td>{user.report_count}</td>
                    <td>
                      {user.subscription_status ? (
                        <span className={`badge badge-${user.subscription_status.toLowerCase()}`}>
                          {statusLabel(user.subscription_status) || user.subscription_status}
                        </span>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>无</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.375rem" }}>
                        <a
                          href={`/admin/user-detail?id=${user.id}`}
                          className="btn btn-outline"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", textDecoration: "none" }}
                        >
                          <ExternalLink size={14} style={{ marginRight: "0.25rem" }} />
                          查看详情
                        </a>
                        <button
                          className={`btn ${user.status === "disabled" ? "btn-primary" : "btn-outline"}`}
                          style={{ padding: "0.25rem 0.625rem", fontSize: "0.75rem" }}
                          onClick={() => toggleUserStatus(user.id, user.status)}
                        >
                          {user.status === "disabled" ? t("action.enable") : t("action.disable")}
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
      )}
    </div>
  );
}
