"use client";

import { useState, useEffect } from "react";
import { get } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

interface DashboardStats {
  today: { pv: number; uv: number; reports: number; newUsers: number };
  totalUsers: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalReports: number;
  hourlyData: { hour: number; reports: number; users: number }[];
  dailyData: { date: string; reports: number; unique_users: number }[];
  moduleData: { module: string; count: number }[];
  statusData: { status: string; count: number }[];
}

const COLORS = ["#1B365D", "#D4AF37", "#059669", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"];

const STATUS_LABELS: Record<string, string> = {
  pending: "待支付",
  completed: "已支付",
  free_with_subscription: "订阅免费",
  refunded: "已退款",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [timeRange, setTimeRange] = useState<"today" | "7d" | "30d">("today");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    get<DashboardStats>(`/dashboard?range=${timeRange}`)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [timeRange]);

  const formatHour = (h: number) => `${h.toString().padStart(2, "0")}:00`;

  return (
    <div>
      {/* ── Top bar ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
          欢迎使用 SinoTrade Compliance 管理后台
        </p>
        <div style={{ display: "flex", gap: "0.375rem" }}>
          {(["today" as const, "7d" as const, "30d" as const]).map((range) => (
            <button
              key={range}
              className={`btn ${timeRange === range ? "btn-gold" : "btn-outline"}`}
              style={{ padding: "0.375rem 0.75rem", fontSize: "0.8rem" }}
              onClick={() => setTimeRange(range)}
            >
              {range === "today" ? "今日" : range === "7d" ? "近7天" : "近30天"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="spinner" />
        </div>
      ) : stats ? (
        <>
          {/* ── Overview stats ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <div className="stat-card">
              <div className="stat-value">{stats.today.reports}</div>
              <div className="stat-label">今日报告</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.today.newUsers}</div>
              <div className="stat-label">今日新用户</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-label">注册用户</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.activeSubscriptions}</div>
              <div className="stat-label">活跃订阅</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalSubscriptions}</div>
              <div className="stat-label">累计订阅</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalReports}</div>
              <div className="stat-label">报告总数</div>
            </div>
          </div>

          {/* ── Hourly trend (today) / Daily trend (7d/30d) ── */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
              {timeRange === "today" ? "今日每小时报告数" : "每日报告趋势"}
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              {timeRange === "today" && stats.hourlyData.length > 0 ? (
                <BarChart data={stats.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tickFormatter={formatHour} fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip labelFormatter={(h) => formatHour(h as number)} />
                  <Legend />
                  <Bar dataKey="reports" name="报告数" fill="#1B365D" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="users" name="新用户" fill="#D4AF37" radius={[3, 3, 0, 0]} />
                </BarChart>
              ) : stats.dailyData.length > 0 ? (
                <LineChart data={stats.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="reports" name="报告数" stroke="#1B365D" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="unique_users" name="独立用户" stroke="#D4AF37" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              ) : (
                <div className="empty-state" style={{ padding: "3rem" }}>
                  暂无数据
                </div>
              )}
            </ResponsiveContainer>
          </div>

          {/* ── Two column: Module breakdown + Payment status ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {/* Module breakdown */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>报告模块分布</h3>
              {stats.moduleData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={stats.moduleData}
                      dataKey="count"
                      nameKey="module"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name} (${value})`}
                    >
                      {stats.moduleData.map((_, index) => (
                        <Cell key={`module-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: "2rem" }}>暂无数据</div>
              )}
            </div>

            {/* Payment status breakdown */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>报告支付状态</h3>
              {stats.statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={stats.statusData.map((s) => ({ ...s, label: STATUS_LABELS[s.status] || s.status }))}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name} (${value})`}
                    >
                      {stats.statusData.map((_, index) => (
                        <Cell key={`status-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: "2rem" }}>暂无数据</div>
              )}
            </div>

            {/* Recent signups */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>快速统计</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ textAlign: "center", padding: "1rem", background: "#F4F6F9", borderRadius: "0.5rem" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1B365D" }}>{stats.totalUsers}</div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>总注册用户</div>
                </div>
                <div style={{ textAlign: "center", padding: "1rem", background: "#F4F6F9", borderRadius: "0.5rem" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#D4AF37" }}>{stats.activeSubscriptions}</div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>活跃订阅</div>
                </div>
                <div style={{ textAlign: "center", padding: "1rem", background: "#F4F6F9", borderRadius: "0.5rem" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#059669" }}>{stats.totalReports}</div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>累计报告</div>
                </div>
                <div style={{ textAlign: "center", padding: "1rem", background: "#F4F6F9", borderRadius: "0.5rem" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#3B82F6" }}>{stats.totalSubscriptions}</div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>累计订阅</div>
                </div>
              </div>
            </div>

            {/* Data status */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>数据集成状态</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.875rem" }}>D1 报告数据</span>
                  <span className="badge badge-active" style={{ fontSize: "0.7rem" }}>已集成</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.875rem" }}>D1 用户数据</span>
                  <span className="badge badge-active" style={{ fontSize: "0.7rem" }}>已集成</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.875rem" }}>CF Web Analytics (PV/UV)</span>
                  <span className="badge badge-pending" style={{ fontSize: "0.7rem" }}>待集成</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.875rem" }}>CF GraphQL (渠道/地域)</span>
                  <span className="badge badge-pending" style={{ fontSize: "0.7rem" }}>待集成</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p>暂无数据</p>
        </div>
      )}
    </div>
  );
}
