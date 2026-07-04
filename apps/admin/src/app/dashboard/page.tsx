"use client";

import { useState, useEffect } from "react";
import { get } from "@/lib/api";

interface DashboardStats {
  today: { pv: number; uv: number; visitors: number; avgDuration: string };
  totalUsers: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalReports: number;
}

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

  return (
    <div>
      {/* Time range selector */}
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
          {/* Overview stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <div className="stat-card">
              <div className="stat-value">{stats.today.pv.toLocaleString()}</div>
              <div className="stat-label">PV（浏览量）</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.today.uv.toLocaleString()}</div>
              <div className="stat-label">UV（访客数）</div>
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
              <div className="stat-value">{stats.totalReports}</div>
              <div className="stat-label">报告总数</div>
            </div>
          </div>

          {/* Hourly trend — placeholder for chart */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
              {timeRange === "today" ? "今日每小时趋势" : "每日访问趋势"}
            </h3>
            <div className="empty-state">
              图表区域 — 集成 Recharts 后展示 {timeRange === "today" ? "0-23时" : "日"} PV/UV 柱状图
            </div>
          </div>

          {/* Two column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>渠道来源</h3>
              <div className="empty-state">饼图 — 集成 Recharts 后展示</div>
            </div>
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>地理位置 Top 10</h3>
              <div className="empty-state">柱状图 — 集成 Recharts 后展示</div>
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
