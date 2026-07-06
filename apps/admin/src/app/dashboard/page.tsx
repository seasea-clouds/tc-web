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

interface AnalyticsData {
  summary: { total: number; uv: number; today: number; todayUV: number; countries: number };
  hourlySum: { hour: number; pv: number; uv: number }[];
  hourlyAvg: { hour: number; pv: number; uv: number }[];
  hoursCovered: number;
  dailyData: { date: string; pv: number; uv: number }[];
  geoData: { country: string; count: number }[];
  pageData: { path: string; count: number }[];
  channelData: { channel: string; count: number }[];
  projectData: { project: string; count: number }[];
}

const COLORS = ["#1B365D", "#D4AF37", "#059669", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const STATUS_LABELS: Record<string, string> = {
  pending: "待支付",
  completed: "已支付",
  free_with_subscription: "订阅免费",
  refunded: "已退款",
};

const COUNTRY_NAMES: Record<string, string> = {
  CN: "中国", US: "美国", JP: "日本", KR: "韩国", GB: "英国",
  DE: "德国", FR: "法国", SG: "新加坡", HK: "香港", TW: "台湾",
  AU: "澳大利亚", CA: "加拿大", IN: "印度", VN: "越南", TH: "泰国",
  MY: "马来西亚", PH: "菲律宾", IT: "意大利", NL: "荷兰", ES: "西班牙",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<"today" | "7d" | "30d">("today");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      get<DashboardStats>(`/dashboard?range=${timeRange}`),
      get<AnalyticsData>(`/analytics?range=${timeRange}`),
    ])
      .then(([s, a]) => {
        setStats(s);
        setAnalytics(a);
      })
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
      ) : stats && analytics ? (
        <>
          {/* ── Overview stats ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div className="stat-card">
              <div className="stat-value">{analytics.summary.today}</div>
              <div className="stat-label">今日 PV</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{analytics.summary.todayUV}</div>
              <div className="stat-label">今日 UV</div>
            </div>
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
          </div>

          {/* ── PV/UV Hourly Trend ── */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
              {timeRange === "today" ? "今日每小时页面浏览" : `近${timeRange === "7d" ? "7" : "30"}天日均每小时浏览`}
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              {(() => {
                const hourlyChartData = timeRange === "today" ? analytics.hourlySum : analytics.hourlyAvg;
                if (hourlyChartData.length > 0) {
                  return (
                    <BarChart data={hourlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="hour" tickFormatter={formatHour} fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip
                        labelFormatter={(label: any) => formatHour(Number(label))}
                        formatter={(value: any, name: any) => [value, name === "pv" ? "PV" : "UV"]}
                      />
                      <Legend />
                      <Bar dataKey="pv" name="pv" fill="#1B365D" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="uv" name="uv" fill="#D4AF37" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  );
                }
                if (analytics.dailyData.length > 0) {
                  return (
                    <LineChart data={analytics.dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="pv" name="PV" stroke="#1B365D" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="uv" name="UV" stroke="#D4AF37" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  );
                }
                return <div className="empty-state" style={{ padding: "2rem" }}>暂无流量数据 — 部署后自动开始采集</div>;
              })()}
            </ResponsiveContainer>
          </div>

          {/* ── Old D1 trend chart ── */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
              {timeRange === "today" ? "今日每小时报告数" : "每日报告趋势"}
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              {timeRange === "today" && stats.hourlyData.length > 0 ? (
                <BarChart data={stats.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tickFormatter={formatHour} fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip labelFormatter={(h) => formatHour(h as number)} />
                  <Legend />
                  <Bar dataKey="reports" name="报告数" fill="#059669" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="users" name="新用户" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                </BarChart>
              ) : stats.dailyData.length > 0 ? (
                <LineChart data={stats.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="reports" name="报告数" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="unique_users" name="独立用户" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              ) : (
                <div className="empty-state" style={{ padding: "2rem" }}>暂无数据</div>
              )}
            </ResponsiveContainer>
          </div>

          {/* ── Geo + Module + Payment — responsive: 1→2→3 columns ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            {/* Geographic distribution */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>地域分布（前 10）</h3>
              {analytics.geoData.length > 0 ? (
                <div>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={analytics.geoData.slice(0, 8)}
                        dataKey="count"
                        nameKey="country"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={({ country, count }: any) => `${COUNTRY_NAMES[country] || country} (${count})`}
                        fontSize={10}
                      >
                        {analytics.geoData.slice(0, 8).map((_, i) => (
                          <Cell key={`geo-${i}`} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", textAlign: "center", marginTop: "0.25rem" }}>
                    覆盖 {analytics.summary.countries} 个国家/地区
                  </div>
                </div>
              ) : (
                <div className="empty-state" style={{ padding: "1.5rem" }}>等待数据采集</div>
              )}
            </div>

            {/* Module breakdown */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>报告模块分布</h3>
              {stats.moduleData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stats.moduleData}
                      dataKey="count"
                      nameKey="module"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ name, value }) => `${name} (${value})`}
                      fontSize={10}
                    >
                      {stats.moduleData.map((_, index) => (
                        <Cell key={`module-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: "1.5rem" }}>暂无数据</div>
              )}
            </div>

            {/* Payment status breakdown */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>报告支付状态</h3>
              {stats.statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stats.statusData.map((s) => ({ ...s, label: STATUS_LABELS[s.status] || s.status }))}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ name, value }) => `${name} (${value})`}
                      fontSize={10}
                    >
                      {stats.statusData.map((_, index) => (
                        <Cell key={`status-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: "1.5rem" }}>暂无数据</div>
              )}
            </div>
          </div>

          {/* ── Channel Source + Site breakdown — responsive ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>渠道来源分布</h3>
              {analytics.channelData && analytics.channelData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={analytics.channelData}
                      dataKey="count"
                      nameKey="channel"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ channel, count }: any) => `${channel} (${count})`}
                      fontSize={11}
                    >
                      {analytics.channelData.map((_: any, index: number) => (
                        <Cell key={`chan-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: "1.5rem" }}>等待数据采集</div>
              )}
            </div>

            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>站点来源分布</h3>
              {analytics.projectData && analytics.projectData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={analytics.projectData}
                      dataKey="count"
                      nameKey="project"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ project, count }: any) => `${project} (${count})`}
                      fontSize={11}
                    >
                      {analytics.projectData.map((_: any, index: number) => (
                        <Cell key={`proj-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: "1.5rem" }}>等待数据采集</div>
              )}
            </div>
          </div>



          {/* ── Bottom row: Pages + Quick stats + Data status — responsive ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "1rem" }}>
            {/* Top pages */}
            <div className="card">
              <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.75rem" }}>热门页面</h3>
              {analytics.pageData.length > 0 ? (
                <div>
                  {analytics.pageData.slice(0, 10).map((p, i) => (
                    <div key={p.path} style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", fontSize: "0.8rem", borderBottom: i < 9 ? "1px solid #f3f4f6" : "none" }}>
                      <span style={{ color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>{p.path}</span>
                      <span style={{ fontWeight: 600, color: "#1B365D" }}>{p.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: "1.5rem" }}>等待数据采集</div>
              )}
            </div>

            {/* Data status */}
            <div>
              <div className="card" style={{ marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.75rem" }}>数据集成状态</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <StatusRow label="D1 报告数据" status="已集成" />
                  <StatusRow label="D1 用户数据" status="已集成" />
                  <StatusRow label="D1 页面浏览量 (PV/UV)" status="已集成" />
                  <StatusRow label="D1 地域分布" status="已集成" />
                  <StatusRow label="D1 渠道来源" status="已集成" />
                  <StatusRow label="D1 站点来源" status="已集成" />
                  <StatusRow label="D1 热门页面" status="已集成" />
                </div>
              </div>

              <div className="card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={{ textAlign: "center", padding: "0.75rem", background: "#F4F6F9", borderRadius: "0.5rem" }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1B365D" }}>{analytics.summary.total}</div>
                  <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>累计 PV</div>
                </div>
                <div style={{ textAlign: "center", padding: "0.75rem", background: "#F4F6F9", borderRadius: "0.5rem" }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#D4AF37" }}>{analytics.summary.uv}</div>
                  <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>累计 UV</div>
                </div>
                <div style={{ textAlign: "center", padding: "0.75rem", background: "#F4F6F9", borderRadius: "0.5rem" }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#059669" }}>{stats.totalReports}</div>
                  <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>累计报告</div>
                </div>
                <div style={{ textAlign: "center", padding: "0.75rem", background: "#F4F6F9", borderRadius: "0.5rem" }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#3B82F6" }}>{stats.totalSubscriptions}</div>
                  <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>累计订阅</div>
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

function StatusRow({ label, status }: { label: string; status: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "0.8rem" }}>{label}</span>
      <span className="badge badge-active" style={{ fontSize: "0.65rem" }}>{status}</span>
    </div>
  );
}
