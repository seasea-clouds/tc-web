"use client";

import { useState, useEffect } from "react";
import { get } from "@/lib/api"
import { buildAdminT } from "@/lib/i18n";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { BLOG_SEGMENT_LABELS } from "@/lib/segment-mapping";

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
  pagePaths: { path: string; count: number }[];
  channelData: { channel: string; count: number }[];
  projectData: { project: string; count: number }[];
  browserData: { browser: string; pageViews: number }[];
  osData: { os: string; count: number }[];
  deviceData: { device: string; count: number }[];
}

const COLORS = ["#1B365D", "#D4AF37", "#059669", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const STATUS_LABELS: Record<string, string> = {
  pending: "status.pending",
  completed: "status.completed",
  free_with_subscription: "status.free",
  refunded: "status.refunded",
};

/** Country code → i18n key map (ISO 3166-1 alpha-2).
 *  Keep sorted by code for easy scanning. */
const COUNTRY_NAMES: Record<string, string> = {
  AE: "country.AE", AF: "country.AF", AL: "country.AL", AM: "country.AM", AO: "country.AO",
  AR: "country.AR", AT: "country.AT", AZ: "country.AZ",
  BA: "country.BA", BD: "country.BD", BE: "country.BE", BF: "country.BF", BG: "country.BG",
  BH: "country.BH", BI: "country.BI", BJ: "country.BJ", BN: "country.BN", BO: "country.BO",
  BR: "country.BR", BW: "country.BW", BY: "country.BY", BZ: "country.BZ",
  CA: "country.CA", CD: "country.CD", CF: "country.CF", CG: "country.CG", CH: "country.CH",
  CI: "country.CI", CL: "country.CL", CM: "country.CM", CN: "country.CN", CO: "country.CO",
  CR: "country.CR", CU: "country.CU", CV: "country.CV", CY: "country.CY", CZ: "country.CZ",
  DE: "country.DE", DJ: "country.DJ", DK: "country.DK", DO: "country.DO", DZ: "country.DZ",
  EC: "country.EC", EE: "country.EE", EG: "country.EG", ER: "country.ER", ES: "country.ES",
  ET: "country.ET",
  FI: "country.FI", FJ: "country.FJ", FR: "country.FR",
  GA: "country.GA", GB: "country.GB", GE: "country.GE", GH: "country.GH", GM: "country.GM",
  GN: "country.GN", GQ: "country.GQ", GR: "country.GR", GT: "country.GT", GW: "country.GW",
  HK: "country.HK", HN: "country.HN", HR: "country.HR", HT: "country.HT", HU: "country.HU",
  ID: "country.ID", IE: "country.IE", IL: "country.IL", IN: "country.IN", IQ: "country.IQ",
  IR: "country.IR", IS: "country.IS", IT: "country.IT",
  JM: "country.JM", JO: "country.JO", JP: "country.JP",
  KE: "country.KE", KG: "country.KG", KH: "country.KH", KM: "country.KM", KN: "country.KN",
  KP: "country.KP", KR: "country.KR", KW: "country.KW", KZ: "country.KZ",
  LA: "country.LA", LB: "country.LB", LI: "country.LI", LK: "country.LK", LR: "country.LR",
  LS: "country.LS", LT: "country.LT", LU: "country.LU", LV: "country.LV", LY: "country.LY",
  MA: "country.MA", MC: "country.MC", MD: "country.MD", ME: "country.ME", MG: "country.MG",
  MK: "country.MK", ML: "country.ML", MM: "country.MM", MN: "country.MN", MO: "country.MO",
  MR: "country.MR", MT: "country.MT", MU: "country.MU", MV: "country.MV", MW: "country.MW",
  MX: "country.MX", MY: "country.MY", MZ: "country.MZ",
  NA: "country.NA", NE: "country.NE", NG: "country.NG", NI: "country.NI", NL: "country.NL",
  NO: "country.NO", NP: "country.NP", NZ: "country.NZ",
  OM: "country.OM",
  PA: "country.PA", PE: "country.PE", PG: "country.PG", PH: "country.PH", PK: "country.PK",
  PL: "country.PL", PS: "country.PS", PT: "country.PT", PY: "country.PY",
  QA: "country.QA",
  RO: "country.RO", RS: "country.RS", RU: "country.RU", RW: "country.RW",
  SA: "country.SA", SB: "country.SB", SD: "country.SD", SE: "country.SE", SG: "country.SG",
  SI: "country.SI", SK: "country.SK", SL: "country.SL", SN: "country.SN", SO: "country.SO",
  SS: "country.SS", SV: "country.SV", SY: "country.SY", SZ: "country.SZ",
  TD: "country.TD", TG: "country.TG", TH: "country.TH", TJ: "country.TJ", TL: "country.TL",
  TM: "country.TM", TN: "country.TN", TR: "country.TR", TW: "country.TW", TZ: "country.TZ",
  UA: "country.UA", UG: "country.UG", US: "country.US", UY: "country.UY", UZ: "country.UZ",
  VE: "country.VE", VN: "country.VN",
  YE: "country.YE",
  ZA: "country.ZA", ZM: "country.ZM", ZW: "country.ZW",
};

/** Language codes → Chinese name mapping */
const LANG_NAMES_ZH: Record<string, string> = {
  en: '英语', zh: '简体中文', es: '西班牙语', fr: '法语', de: '德语',
  ja: '日语', pt: '葡萄牙语', ru: '俄语', ar: '阿拉伯语', ko: '韩语',
  it: '意大利语', nl: '荷兰语', tr: '土耳其语', vi: '越南语', id: '印尼语',
  th: '泰语', hi: '印地语', pl: '波兰语', sv: '瑞典语', el: '希腊语',
  cs: '捷克语', ro: '罗马尼亚语', hu: '匈牙利语', fi: '芬兰语', da: '丹麦语',
  no: '挪威语', uk: '乌克兰语', bg: '保加利亚语', hr: '克罗地亚语', sr: '塞尔维亚语',
  sk: '斯洛伐克语', sl: '斯洛文尼亚语', ms: '马来语', ka: '格鲁吉亚语',
  he: '希伯来语', sw: '斯瓦希里语', bn: '孟加拉语', ca: '加泰罗尼亚语',
  fa: '波斯语', ur: '乌尔都语', ta: '泰米尔语', af: '南非荷兰语',
  sq: '阿尔巴尼亚语', az: '阿塞拜疆语', hy: '亚美尼亚语', be: '白俄罗斯语',
  ne: '尼泊尔语', si: '僧伽罗语',
};

/** Supported 2-letter locale set (48 langs) */
const SUPPORTED_LOCALES = new Set(Object.keys(LANG_NAMES_ZH));

/**
 * Extract language distribution from page path data.
 * Parses locale prefix from first URL segment (e.g., /en/... → en).
 */
function extractLangData(
  pagePaths: { path: string; count: number }[] | undefined,
  pageData: { path: string; count: number }[] | undefined,
): { lang: string; count: number }[] {
  const pages = pagePaths && pagePaths.length > 0 ? pagePaths : (pageData || []);
  if (pages.length === 0) return [];

  const langMap = new Map<string, number>();

  for (const p of pages) {
    const segs = p.path.replace(/\/+$/, '').split('/').filter(Boolean);
    if (segs.length > 0 && SUPPORTED_LOCALES.has(segs[0])) {
      const lang = segs[0];
      langMap.set(lang, (langMap.get(lang) || 0) + p.count);
    }
  }

  return Array.from(langMap.entries())
    .map(([lang, count]) => ({ lang, count }))
    .sort((a, b) => b.count - a.count);
}

/** Extract locale string in Chinese from a URL path */
function localeFromPath(path: string): string {
  const segs = path.replace(/\/+$/, '').split('/').filter(Boolean);
  if (segs.length > 0 && SUPPORTED_LOCALES.has(segs[0])) {
    return LANG_NAMES_ZH[segs[0]];
  }
  return '-';
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<
    "today" | "7d" | "30d" | "custom"
  >("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const t = buildAdminT();
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

/** Empty state chart placeholder with visual SVG icon */
function EmptyState({ message, compact = false }: { message: string; compact?: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '0.75rem',
      padding: compact ? '1.5rem' : '2.5rem',
      color: '#9ca3af', userSelect: 'none',
    }}>
      <svg width={compact ? 36 : 48} height={compact ? 36 : 48} viewBox="0 0 48 48" fill="none" opacity={0.5}>
        <rect x="6" y="28" width="8" height="14" rx="2" fill="#D4AF37" fillOpacity={0.4} />
        <rect x="18" y="18" width="8" height="24" rx="2" fill="#1B365D" fillOpacity={0.4} />
        <rect x="30" y="22" width="8" height="20" rx="2" fill="#D4AF37" fillOpacity={0.4} />
        <rect x="42" y="12" width="6" height="30" rx="2" fill="#1B365D" fillOpacity={0.4} />
      </svg>
      <p style={{ fontSize: compact ? '0.8rem' : '0.875rem', margin: 0, color: '#9ca3af', textAlign: 'center' }}>{message}</p>
    </div>
  );
}

// ── Page path to breadcrumb ──
// Known segment names for breadcrumb display (en locale common segments)
const STATIC_SEGMENT_LABELS: Record<string, string> = {
  // ── Site (site) ──
  'c': 'segment.c',
  'services': 'segment.services',
  'gacc': 'segment.gacc',
  'ccc': 'segment.ccc',
  'label': 'segment.label',
  'cosmetics': 'segment.cosmetics',
  'ecommerce': 'segment.ecommerce',
  'brand': 'segment.brand',
  'industries': 'segment.industries',
  'testimonials': 'segment.testimonials',
  'quote': 'segment.quote',
  'packages': 'segment.packages',
  'thank-you': 'segment.thankYou',
  // ── Portal (c/) ──
  'check': 'segment.check',
  'report': 'segment.report',
  'preview': 'segment.preview',
  'crossborder': 'segment.crossborder',
  'trademark': 'segment.trademark',
  'nmpa': 'segment.nmpa',
  'register': 'segment.register',
  'login': 'segment.login',
  'me': 'segment.me',
  'pricing': 'segment.pricing',
  'account': 'segment.account',
  'subscription': 'segment.subscription',
  'dashboard': 'segment.dashboard',
  // ── Blog ──
  'blog': 'segment.blog',
  // ── Admin ──
  'admin': 'segment.admin',
  'users': 'segment.users',
  'logs': 'segment.logs',
  'subscriptions': 'segment.subscriptions',
  'reports': 'segment.reports',
  'user-detail': 'segment.userDetail',
  'report-detail': 'segment.reportDetail',
  'subscription-detail': 'segment.subscriptionDetail',
  // ── Common ──
  'about': 'segment.about',
  'contact': 'segment.contact',
  'faq': 'segment.faq',
  'payments': 'segment.payments',
  // ── Root / Locale-only ──
  '__home__': 'segment.home',
  // ── Site pages ──
  'privacy': 'segment.privacy',
  'terms': 'segment.terms',
  // ── Industry pages ──
  'skincare-cosmetics': 'segment.skincare',
  'medical-devices': 'segment.medicalDevices',
  'dairy-milk-products': 'segment.dairyMilk',
  'meat-seafood': 'segment.meatSeafood',
  'wine-spirits': 'segment.wineSpirits',
  'pet-food': 'segment.petFood',
  'health-supplements': 'segment.healthSupplements',
  'baby-maternal': 'segment.babyMaternal',
  'consumer-electronics': 'segment.consumerElectronics',
  'cross-border-ecommerce': 'segment.crossBorderEcommerce',
};

/** Parse a URL path into a breadcrumb-like segment array (locale-aware) */
function pathToBreadcrumb(path: string): string {
  const segs = path.replace(/\/+$/, '').split('/').filter(Boolean);
  if (segs.length === 0) return t(STATIC_SEGMENT_LABELS['__home__']);
  // Skip locale prefix (en, zh, etc)
  const skipLocale = segs.length > 0 && /^[a-z]{2}$/.test(segs[0]);
  const bc = skipLocale ? segs.slice(1) : segs;
  if (bc.length === 0) return t(STATIC_SEGMENT_LABELS['__home__']);
  return bc.map(s => {
    // 1. Static segments (site/portal/admin routes) — use translation keys
    const key = STATIC_SEGMENT_LABELS[s];
    if (key) return t(key);
    // 2. Blog article slugs — use auto-generated Chinese title
    const blogLabel = BLOG_SEGMENT_LABELS[s];
    if (blogLabel) return blogLabel;
    // 3. Fallback: English segment name
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/[-_]/g, ' ');
  }).join(' › ');
}

  return (
    <div>
      {/* ── Top bar ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
          {t("welcome")}
        </p>
        <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
          {(["today" as const, "7d" as const, "30d" as const, "custom" as const]).map((range) => (
            <button
              key={range}
              className={`btn ${timeRange === range ? "btn-gold" : "btn-outline"}`}
              style={{ padding: "0.375rem 0.75rem", fontSize: "0.8rem" }}
              onClick={() => setTimeRange(range)}
            >
              {range === "today" ? t("range.today") : range === "7d" ? t("range.7d") : range === "30d" ? t("range.30d") : t("range.custom")}
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
              <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>{t("range.to")}</span>
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
        const _a = analytics ?? { allTimeTotal: 0, allTimeUV: 0, summary: { today: 0, total: 0, todayUV: 0, uv: 0, countries: 0 } as any, hourlySum: [] as any[], hourlyAvg: [] as any[], dailyData: [] as any[], geoData: [] as any[], browserData: [] as any[], osData: [] as any[], deviceData: [] as any[], projectData: [] as any[], pageData: [] as any[], pagePaths: [] as any[] };
        return (
        <>
          {/* ── Overview stats (range-aware) + cumulative ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div className="stat-card">
              <div className="stat-value">{timeRange === "today" ? _a.summary.today : _a.summary.total}</div>
              <div className="stat-label">{timeRange === "today" ? t("stat.todayPV") : timeRange === "7d" ? t("stat.7dPV") : timeRange === "30d" ? t("stat.30dPV") : t("stat.customPV")}</div>
              <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginTop: "0.15rem" }}>{t("stat.cumulative").replace("{n}", String(_a.allTimeTotal))}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{timeRange === "today" ? _a.summary.todayUV : _a.summary.uv}</div>
              <div className="stat-label">{timeRange === "today" ? t("stat.todayUV") : timeRange === "7d" ? t("stat.7dUV") : timeRange === "30d" ? t("stat.30dUV") : t("stat.customUV")}</div>
              <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginTop: "0.15rem" }}>{t("stat.cumulative").replace("{n}", String(_a.allTimeUV))}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{timeRange === "today" ? stats.today.reports : stats.period?.reports || 0}</div>
              <div className="stat-label">{timeRange === "today" ? t("stat.todayReports") : timeRange === "7d" ? t("stat.7dReports") : timeRange === "30d" ? t("stat.30dReports") : t("stat.customReports")}</div>
              <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginTop: "0.15rem" }}>{t("stat.cumulative").replace("{n}", String(stats.totalReports))}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{timeRange === "today" ? stats.today.newUsers : stats.period?.newUsers || 0}</div>
              <div className="stat-label">{timeRange === "today" ? t("stat.todayNewUsers") : timeRange === "7d" ? t("stat.7dNewUsers") : timeRange === "30d" ? t("stat.30dNewUsers") : t("stat.customNewUsers")}</div>
              <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginTop: "0.15rem" }}>{t("stat.cumulative").replace("{n}", String(stats.totalUsers))}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.activeSubscriptions}</div>
              <div className="stat-label">{t("stat.activeSubscriptions")}</div>
              <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginTop: "0.15rem" }}>{t("stat.cumulative").replace("{n}", String(stats.totalSubscriptions))}</div>
            </div>
          </div>

          {/* ── PV/UV Trend — hourly for today, daily for other ranges ── */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
              {timeRange === "today" ? t("chart.todayHourlyPV") : t("chart.dailyPVTrend")}
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
                return <EmptyState message={t("chart.noTrafficData")} />;
              })()}
            </ResponsiveContainer>
          </div>

          {/* ── Old D1 trend chart ── */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
              {timeRange === "today" ? t("chart.todayHourlyReports") : t("chart.dailyReportTrend")}
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              {timeRange === "today" && stats.hourlyData.length > 0 ? (
                <BarChart data={stats.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tickFormatter={formatHour} fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip labelFormatter={(h) => formatHour(h as number)} />
                  <Legend />
                  <Bar dataKey="reports" name={t("chart.reports")} fill="#059669" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="users" name={t("chart.newUsers")} fill="#3B82F6" radius={[3, 3, 0, 0]} />
                </BarChart>
              ) : stats.dailyData.length > 0 ? (
                <LineChart data={stats.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="reports" name={t("chart.reports")} stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="unique_users" name={t("chart.uniqueUsers")} stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              ) : (
                <EmptyState message={t("chart.noData")} />
              )}
            </ResponsiveContainer>
          </div>

          {/* ── All charts in one responsive grid (7 cards) ── */}
          <div className="chart-grid">
            {/* Geographic distribution */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>{t("chart.geoDistribution")}</h3>
              {_a.geoData.length > 0 ? (
                <div>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={_a.geoData.slice(0, 8)}
                        dataKey="count"
                        nameKey="country"
                        cx="50%" cy="50%" outerRadius={90}
                        label={({ country, count }: any) => `${t(COUNTRY_NAMES[country]) || country} (${count})`}
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
                    {t("chart.countriesCovered").replace("{n}", String(_a.summary.countries))}
                  </div>
                </div>
              ) : (
                <EmptyState message={t("chart.waitingData")} compact />
              )}
            </div>

            {/* Module breakdown */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>{t("chart.moduleDistribution")}</h3>
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
                <EmptyState message={t("chart.noData")} compact />
              )}
            </div>

            {/* Payment status breakdown */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>{t("chart.paymentStatus")}</h3>
              {stats.statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={stats.statusData.map((s) => ({ ...s, label: t(STATUS_LABELS[s.status]) || s.status }))}
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
                <EmptyState message={t("chart.noData")} compact />
              )}
            </div>

            {/* Browser distribution */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>{t("chart.browserDistribution")}</h3>
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
                <EmptyState message={t("chart.noData")} compact />
              )}
            </div>

            {/* OS distribution */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>{t("chart.osDistribution")}</h3>
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
                <EmptyState message={t("chart.noData")} compact />
              )}
            </div>

            {/* Device type */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>{t("chart.deviceType")}</h3>
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
                <EmptyState message={t("chart.noData")} compact />
              )}
            </div>

            {/* Site breakdown */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>{t("chart.siteDistribution")}</h3>
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
                <EmptyState message={t("chart.waitingData")} compact />
              )}
            </div>

            {/* Language distribution */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>{t("chart.langDistribution")}</h3>
              {(() => {
                const langData = extractLangData(_a.pagePaths, _a.pageData);
                return langData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={langData}
                        dataKey="count"
                        nameKey="lang"
                        cx="50%" cy="50%" outerRadius={90}
                        label={({ lang, count }: any) => `${LANG_NAMES_ZH[lang] || lang} (${count})`}
                        fontSize={11}
                      >
                        {langData.map((_: any, index: number) => (
                          <Cell key={`lang-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState message={t("chart.waitingData")} compact />
                );
              })()}
            </div>
          </div>

          {/* ── 热门页面 (full-width row, top 30, filtered pages only) ── */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>{t("chart.topPages")}</h3>
            {(() => {
              // 使用服务端过滤好的 pagePaths（基于路由架构 isPage + 静态资源排除）
              // 兼容旧数据：如果 pagePaths 不存在，回退到客户端过滤
              const pages = _a.pagePaths && _a.pagePaths.length > 0
                ? _a.pagePaths.filter((p: any) => {
                    const path = typeof p === 'string' ? p : p.path;
                    return !/\.(js|ttf|woff2?|css|png|jpe?g|gif|svg|ico|webp|json|map|txt|xml|php|asp|aspx|jsp|cgi)(\?|$)/i.test(path)
                      && !path.startsWith('/_next/')
                      && !['/info'].includes(path);
                  }).slice(0, 30)
                : _a.pageData.filter((p: any) => {
                    const isRes = (p: string) => /\.(js|ttf|woff2?|css|png|jpe?g|gif|svg|ico|webp|json|map|txt|xml|php|asp|aspx|jsp|cgi)(\?|$)/i.test(p) || p.startsWith('/_next/') || /\/(php_info|wp-|xmlrpc)\./.test(p);
                    return !isRes(p.path) && !['/info'].includes(p.path);
                  }).slice(0, 30);
              return pages.length > 0 ? (
                <div>
                  {/* Column headers */}
                  <div style={{ display: "flex", padding: "0.3rem 0", fontSize: "0.7rem", fontWeight: 600, color: "#9ca3af", borderBottom: "1px solid #e5e7eb" }}>
                    <span style={{ flex: "0 0 35%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t("chart.pathColumn")}</span>
                    <span style={{ flex: "0 0 12%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: "0.5rem" }}>语言</span>
                    <span style={{ flex: "0 0 35%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: "0.5rem" }}>{t("chart.urlColumn")}</span>
                    <span style={{ flex: "0 0 18%", textAlign: "right" }}>{t("chart.visitsColumn")}</span>
                  </div>
                  {pages.map((p: any, i: number) => (
                    <div key={p.path} style={{ display: "flex", alignItems: "center", padding: "0.3rem 0", fontSize: "0.8rem", borderBottom: i < pages.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                      <span style={{ flex: "0 0 35%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#374151", fontSize: "0.75rem" }} title={pathToBreadcrumb(p.path)}>
                        {pathToBreadcrumb(p.path)}
                      </span>
                      <span style={{ flex: "0 0 12%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#6b7280", fontSize: "0.7rem", paddingLeft: "0.5rem" }} title={p.path}>
                        {localeFromPath(p.path)}
                      </span>
                      <span style={{ flex: "0 0 35%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#6b7280", fontSize: "0.7rem", paddingLeft: "0.5rem" }} title={p.path}>
                        {p.path}
                      </span>
                      <span style={{ flex: "0 0 18%", textAlign: "right", fontWeight: 600, color: "#1B365D", whiteSpace: "nowrap" }}>{p.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message={t("chart.waitingData")} compact />
              );
            })()}
          </div>

          {/* ── 热门路径 (full-width row, top 30, all paths incl. resources) ── */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>{t("chart.topPaths")}</h3>
            {_a.pageData.length > 0 ? (
              <div>
                {_a.pageData.filter((p: any) => !/\b_profiler\b|\bphpinfo\b|\.php$|\.env[.$]|wp-config|\.git\/|\.svn\/|\.htaccess|\bwp-(admin|login|content|includes)\b|xmlrpc|\badminer\b|\bphpmyadmin\b|\bjoomla\b|\bdrupal\b|\bmagento\b|\bactuator\b|sftp-config|\.DS_Store|\.vscode\/|\.idea\//i.test(p.path)).slice(0, 30).map((p, i) => (
                  <div key={p.path} style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", fontSize: "0.8rem", borderBottom: i < 29 ? "1px solid #f3f4f6" : "none" }}>
                    <span style={{ color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.path}</span>
                    <span style={{ fontWeight: 600, color: "#1B365D", whiteSpace: "nowrap", marginLeft: "1rem" }}>{p.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message={t("chart.waitingData")} compact />
            )}
          </div>
        </>
        );
      })() : (
        <EmptyState message={t("chart.noData")} />
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
