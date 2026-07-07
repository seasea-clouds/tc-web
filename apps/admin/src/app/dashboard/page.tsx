"use client";

import { useState, useEffect } from "react";
import { get } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

interface DashboardStats {
  today: { pv: number; uv: number; reports: number; newUsers: number };
  period: { reports: number; newUsers: number };
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
  allTimeTotal: number;
  allTimeUV: number;
  summary: { total: number; uv: number; today: number; todayUV: number; countries: number };
  hourlySum: { hour: number; pv: number; uv: number }[];
  hourlyAvg: { hour: number; pv: number; uv: number }[];
  hoursCovered: number;
  dailyData: { date: string; pv: number; uv: number }[];
  geoData: { country: string; count: number }[];
  pageData: { path: string; count: number }[];
  channelData: { channel: string; count: number }[];
  projectData: { project: string; count: number }[];
  browserData: { browser: string; pageViews: number }[];
  osData: { os: string; count: number }[];
  deviceData: { device: string; count: number }[];
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
  const [timeRange, setTimeRange] = useState<
    "today" | "7d" | "30d" | "custom"
  >("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    setLoading(true);
    const common = `/dashboard?range=${timeRange}`;
    let analyticsUrl = `/analytics?range=${timeRange}`;
    if (timeRange === "custom" && customStartDate && customEndDate) {
      analyticsUrl = `/analytics?range=${timeRange}&start_date=${customStartDate}&end_date=${customEndDate}`;
    }
    // Fetch dashboard & analytics independently so analytics failure doesn't block stats
    Promise.allSettled([
      get<DashboardStats>(common),
      get<AnalyticsData>(analyticsUrl),
    ]).then(([statsResult, analyticsResult]) => {
      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
      if (analyticsResult.status === 'fulfilled') setAnalytics(analyticsResult.value);
    }).finally(() => setLoading(false));
  }, [timeRange, refreshKey, customStartDate, customEndDate]);

  const formatHour = (h: number) => `${h.toString().padStart(2, "0")}:00`;

  return (
    <div>
      {/* ── Top bar ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
          欢迎使用 SinoTrade Compliance 管理后台
        </p>
        <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
          {(["today" as const, "7d" as const, "30d" as const, "custom" as const]).map((range) => (
            <button
              key={range}
              className={`btn ${timeRange === range ? "btn-gold" : "btn-outline"}`}
              style={{ padding: "0.375rem 0.75rem", fontSize: "0.8rem" }}
              onClick={() => setTimeRange(range)}
            >
              {range === "today" ? "今日" : range === "7d" ? "近7天" : range === "30d" ? "近30天" : "自定义"}
            </button>
          ))}
          {timeRange === "custom" && (
            <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.8rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                }}
              />
              <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>至</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.8rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                }}
              />
            </div>
          )}

        </div>
      </div>

      {/* ── Responsive chart grid CSS ── */}
      <style>{`
        .chart-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        @media (min-width: 768px) {
          .chart-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .chart-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="spinner" />
        </div>
      ) : stats ? (() => {
        const _a = analytics ?? { allTimeTotal: 0, allTimeUV: 0, summary: { today: 0, total: 0, todayUV: 0, uv: 0, countries: 0 } as any, hourlySum: [] as any[], hourlyAvg: [] as any[], dailyData: [] as any[], geoData: [] as any[], browserData: [] as any[], osData: [] as any[], deviceData: [] as any[], projectData: [] as any[], pageData: [] as any[] };
        return (
        <>
          {/* ── Overview stats (range-aware) + cumulative ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div className="stat-card">
              <div className="stat-value">{timeRange === "today" ? _a.summary.today : _a.summary.total}</div>
              <div className="stat-label">{timeRange === "today" ? "今日 PV" : timeRange === "7d" ? "近7天 PV" : timeRange === "30d" ? "近30天 PV" : "所选时段 PV"}</div>
              <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginTop: "0.15rem" }}>累计 {_a.allTimeTotal}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{timeRange === "today" ? _a.summary.todayUV : _a.summary.uv}</div>
              <div className="stat-label">{timeRange === "today" ? "今日 UV" : timeRange === "7d" ? "近7天 UV" : timeRange === "30d" ? "近30天 UV" : "所选时段 UV"}</div>
              <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginTop: "0.15rem" }}>累计 {_a.allTimeUV}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{timeRange === "today" ? stats.today.reports : stats.period?.reports || 0}</div>
              <div className="stat-label">{timeRange === "today" ? "今日报告" : timeRange === "7d" ? "近7天报告" : timeRange === "30d" ? "近30天报告" : "所选时段报告"}</div>
              <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginTop: "0.15rem" }}>累计 {stats.totalReports}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{timeRange === "today" ? stats.today.newUsers : stats.period?.newUsers || 0}</div>
              <div className="stat-label">{timeRange === "today" ? "今日新用户" : timeRange === "7d" ? "近7天新用户" : timeRange === "30d" ? "近30天新用户" : "所选时段新用户"}</div>
              <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginTop: "0.15rem" }}>累计 {stats.totalUsers}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-label">注册用户（累计）</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.activeSubscriptions}</div>
              <div className="stat-label">活跃订阅</div>
            </div>
          </div>

          {/* ── PV/UV Trend — hourly for today, daily for other ranges ── */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
              {timeRange === "today" ? "今日每小时页面浏览" : "每日页面浏览趋势"}
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              {(() => {
                if (timeRange === "today") {
                  if (_a.hourlySum.length > 0) {
                    return (
                      <BarChart data={_a.hourlySum}>
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
                }
                if (_a.dailyData.length > 0) {
                  return (
                    <LineChart data={_a.dailyData}>
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

          {/* ── All charts in one responsive grid (7 cards) ── */}
          <div className="chart-grid">
            {/* Geographic distribution */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>地域分布（前 10）</h3>
              {_a.geoData.length > 0 ? (
                <div>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={_a.geoData.slice(0, 8)}
                        dataKey="count"
                        nameKey="country"
                        cx="50%" cy="50%" outerRadius={90}
                        label={({ country, count }: any) => `${COUNTRY_NAMES[country] || country} (${count})`}
                        fontSize={10}
                      >
                        {_a.geoData.slice(0, 8).map((_, i) => (
                          <Cell key={`geo-${i}`} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", textAlign: "center", marginTop: "0.25rem" }}>
                    覆盖 {_a.summary.countries} 个国家/地区
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
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={stats.moduleData}
                      dataKey="count"
                      nameKey="module"
                      cx="50%" cy="50%" outerRadius={90}
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
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={stats.statusData.map((s) => ({ ...s, label: STATUS_LABELS[s.status] || s.status }))}
                      dataKey="count"
                      nameKey="label"
                      cx="50%" cy="50%" outerRadius={90}
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

            {/* Browser distribution */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>浏览器分布</h3>
              {_a.browserData && _a.browserData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={_a.browserData.slice(0, 8)}
                      dataKey="pageViews"
                      nameKey="browser"
                      cx="50%" cy="50%" outerRadius={90}
                      label={({ browser, pageViews }: any) => `${browser} (${pageViews})`}
                      fontSize={10}
                    >
                      {_a.browserData.slice(0, 8).map((_: any, i: number) => (
                        <Cell key={`br-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: "1.5rem" }}>暂无数据</div>
              )}
            </div>

            {/* OS distribution */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>OS 分布</h3>
              {_a.osData && _a.osData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={_a.osData.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" fontSize={10} />
                    <YAxis type="category" dataKey="os" fontSize={10} width={70} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1B365D" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: "1.5rem" }}>暂无数据</div>
              )}
            </div>

            {/* Device type */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>设备类型</h3>
              {_a.deviceData && _a.deviceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={_a.deviceData}
                      dataKey="count"
                      nameKey="device"
                      cx="50%" cy="50%" outerRadius={90}
                      label={({ device, count }: any) => `${device} (${count})`}
                      fontSize={11}
                    >
                      {_a.deviceData.map((_: any, index: number) => (
                        <Cell key={`dev-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: "1.5rem" }}>暂无数据</div>
              )}
            </div>

            {/* Site breakdown */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>站点来源分布</h3>
              {_a.projectData && _a.projectData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={_a.projectData}
                      dataKey="count"
                      nameKey="project"
                      cx="50%" cy="50%" outerRadius={90}
                      label={({ project, count }: any) => `${project} (${count})`}
                      fontSize={11}
                    >
                      {_a.projectData.map((_: any, index: number) => (
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

          {/* ── 热门页面 (full-width row, top 20) ── */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>热门页面（统计区间）</h3>
            {_a.pageData.length > 0 ? (
              <div>
                {_a.pageData.slice(0, 20).map((p, i) => (
                  <div key={p.path} style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", fontSize: "0.8rem", borderBottom: i < 19 ? "1px solid #f3f4f6" : "none" }}>
                    <span style={{ color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.path}</span>
                    <span style={{ fontWeight: 600, color: "#1B365D", whiteSpace: "nowrap", marginLeft: "1rem" }}>{p.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "1.5rem" }}>等待数据采集</div>
            )}
          </div>
        </>
        );
      })() : (
        <div className="empty-state">
          <p>暂无数据</p>
        </div>
      )}

      {/* ── Toast notification ── */}
      {toast && (
        <div className={`toast toast-${toast.type}`} style={{ position: "fixed", top: "1rem", right: "1rem", zIndex: 999 }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
