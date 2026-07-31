/**
 * CF Analytics — Cloudflare GraphQL Analytics query library.
 *
 * Provides typed functions to fetch daily/hourly/path analytics from CF's
 * GraphQL API and normalize the results into D1-friendly JSON.
 *
 * Environment variables expected in Cloudflare Pages:
 *   CLOUDFLARE_API_TOKEN  — CF API token with Analytics Read permission
 *   CLOUDFLARE_ZONE_ID    — Zone ID for sinotradecompliance.com
 */

const CF_API = "https://api.cloudflare.com/client/v4/graphql";

// ── Types ────────────────────────────────────────────────────────

export interface DailyStats {
  date: string;
  pv: number;
  uv: number;
  requests: number;
  bytes: number;
  cachedRequests: number;
  /** [{clientCountryName, requests}] */
  countryMap: { clientCountryName: string; requests: number }[];
  /** [{uaBrowserFamily, pageViews}] */
  browserMap: { uaBrowserFamily: string; pageViews: number }[];
  /** [{edgeResponseStatus, requests}] */
  statusCodeMap: { edgeResponseStatus: number; requests: number }[];
}

export interface HourlyStats {
  date: string; // YYYY-MM-DD
  hour: number; // 0-23
  pv: number;
  uv: number;
  requests: number;
  /** [{clientCountryName, requests}] — available from 1hGroups (same schema as 1dGroups) */
  countryMap?: { clientCountryName: string; requests: number }[];
  /** [{uaBrowserFamily, pageViews}] — available from 1hGroups */
  browserMap?: { uaBrowserFamily: string; pageViews: number }[];
  /** OS distribution from adaptive groups */
  osData?: { os: string; count: number }[];
  /** Device type distribution from adaptive groups */
  deviceData?: { device: string; count: number }[];
  /** Page path data from adaptive groups */
  pathData?: { path: string; count: number }[];
  /** Page-only paths filtered by routing architecture */
  pagePaths?: { path: string; count: number }[];
  /** Project distribution inferred from path prefixes */
  projectData?: { project: string; count: number }[];
}

export interface PathStat {
  path: string;
  count: number;
}

export interface AggregateStats {
  /** [{userAgentOS, count}, …] */
  osData: { os: string; count: number }[];
  /** [{clientDeviceType, count}, …] */
  deviceData: { device: string; count: number }[];
  /** [{clientRequestPath, count}, …] */
  pathData: { path: string; count: number }[];
  /** [{project, count}, …] — inferred from path prefixes */
  projectData: { project: string; count: number }[];
}

// ── Helpers ──────────────────────────────────────────────────────

/** Fetch GraphQL from CF. Throws on HTTP error. */
export async function graphql(query: string, token: string): Promise<any> {
  const resp = await fetch(CF_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!resp.ok) {
    throw new Error(`CF GraphQL HTTP ${resp.status}: ${await resp.text().catch(() => "no body")}`);
  }
  const body = await resp.json();
  if (body.errors && body.errors.length > 0) {
    const msgs = body.errors.map((e: any) => e.message).join("; ");
    throw new Error(`CF GraphQL errors: ${msgs}`);
  }
  return body.data || {};
}

/** Ensure a string has at least `minLen` chars (pad with zero if needed). */
function padStart(s: string, minLen: number): string {
  while (s.length < minLen) s = "0" + s;
  return s;
}

/**
 * 已知路由段白名单（面包屑语法）。
 * 与前端 pathToBreadcrumb 的 STATIC_SEGMENT_LABELS 以及
 * site / portal / blog / admin 的真实路由保持一致。
 *
 * 【新增页面时】在此添加新段；【扫描器路径】无需维护——
 * 不在白名单中的路径自动归为 unknown 被排除。
 */

/** 站点支持的 48 个语言前缀（与 packages/ui/src/locales.json 一致） */
const KNOWN_LOCALES: ReadonlySet<string> = new Set([
  "en", "zh", "es", "fr", "de", "ja", "pt", "ru", "ar", "ko", "it",
  "nl", "tr", "vi", "id", "th", "hi", "pl", "sv", "el", "cs", "ro",
  "hu", "fi", "da", "no", "uk", "bg", "hr", "sr", "sk", "sl", "ms",
  "ka", "he", "sw", "bn", "ca", "fa", "ur", "ta", "af", "sq", "az",
  "hy", "be", "ne", "si",
]);

const KNOWN_SEGMENTS: ReadonlySet<string> = new Set([
  // ── site 顶层页 ──
  "about",
  "ai-assistance",
  "faq",
  "industries",
  "packages",
  "privacy",
  "quote",
  "services",
  "sitemap",
  "terms",
  "testimonials",
  "thank-you",
  // ── services 子页 ──
  "brand",
  "ccc",
  "cosmetics",
  "ecommerce",
  "gacc",
  "label",
  // ── industries 品类（静态段）──
  "skincare-cosmetics",
  "medical-devices",
  "dairy-milk-products",
  "meat-seafood",
  "wine-spirits",
  "pet-food",
  "health-supplements",
  "baby-maternal",
  "consumer-electronics",
  "cross-border-ecommerce",
  // ── portal（c/）──
  "c",
  "check",
  "crossborder",
  "trademark",
  "nmpa",
  "register",
  "login",
  "me",
  "reports",
  "settings",
  "subscription",
  "pricing",
  "report",
  "preview",
  "account",
  "dashboard",
  "payments",
  "contact",
  // ── blog ──
  "blog",
  // ── admin ──
  "admin",
  "users",
  "logs",
  "subscriptions",
  "user-detail",
  "report-detail",
  "subscription-detail",
]);

/**
 * 动态段验证：/blog/{slug} 的 slug 格式。
 * 博客文章 slug 为小写字母/数字/连字符，且由构建时生成、数量不定。
 * 其他父段（services、industries、admin 等）的子段必须全在白名单中。
 */
function isValidDynamicSegment(parent: string, seg: string): boolean {
  if (parent !== "blog") return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(seg);
}

/**
 * 路径是否匹配已知路由（面包屑语法白名单）。
 * 仅用于 site / portal / blog / admin 子站路径。
 *
 * 规则：
 * 1. 路径第一段必须是 48 个 locale 之一（如 /en/...），或根路径 /
 * 2. 剥离 locale 后，剩余段必须都是已知静态段或合法动态段（blog 下的 slug）
 * 3. 无 locale 前缀的裸路径（/c/...、/blog/...、/admin/...）第一段必须在白名单中
 */
export function matchesKnownRoute(path: string): boolean {
  const clean = path.replace(/\/+$/, "");
  if (clean === "" || clean === "/") return true;
  const segs = clean.split("/").filter(Boolean);

  let start = 0;
  // 有 locale 前缀：剥离之（如 /en/about → about）
  if (KNOWN_LOCALES.has(segs[0])) {
    start = 1;
    // 纯 locale 路径（如 /en）→ 首页，合法
    if (segs.length === 1) return true;
  }

  // 第一段必须是已知静态段
  if (!KNOWN_SEGMENTS.has(segs[start])) return false;

  // 剩余段：已知静态段 或 合法动态段（blog 下的 slug）
  for (let i = start + 1; i < segs.length; i++) {
    const seg = segs[i];
    if (KNOWN_SEGMENTS.has(seg)) continue;
    if (isValidDynamicSegment(segs[i - 1], seg)) continue;
    return false;
  }
  return true;
}

/**
 * 路由架构识别 —— 判断一个请求路径属于哪个子站。
 *
 * 返回值：
 *   project  子站标识（admin / api / portal / blog / site / unknown）
 *   isPage   该子站的页面路径是否应计入「热门页面」
 *     true  → 面向用户的页面（官网/Portal/博客），进入热门页面榜单
 *     false → 内部或非页面（管理后台/API），不计入热门页面
 *
 * 注意：「热门路径」不受 isPage 影响，它展示所有路径（含 admin/API）。
 *
 * ════════════════════════════════════════════════════
 * 【⚠️ 新增子站时必须做的操作】
 * 加一行 return 时，必须根据该子站是否对外提供页面来决定 isPage 的值。
 * 如果不确定，与管理者确认。
 * ════════════════════════════════════════════════════
 */
export function inferProject(path: string): { project: string; isPage: boolean } {
  // 管理后台 — 内部页面，不计入对外热门页面
  if (path.startsWith("/admin/")) return { project: "admin", isPage: false };
  // API 端点 — 非页面，不计入热门页面
  if (path.startsWith("/api/")) return { project: "api", isPage: false };
  // 用户站（Portal）— 对外页面，计入热门页面
  if (path.startsWith("/c/") || /^\/[a-z]{2}\/c\//.test(path)) {
    return matchesKnownRoute(path)
      ? { project: "portal", isPage: true }
      : { project: "unknown", isPage: false };
  }
  // 博客站 — 对外页面，计入热门页面
  if (path.startsWith("/blog/") || /^\/[a-z]{2}\/blog\//.test(path)) {
    return matchesKnownRoute(path)
      ? { project: "blog", isPage: true }
      : { project: "unknown", isPage: false };
  }
  // 官网主站（Site）— 对外页面，计入热门页面
  // 必须是 /{locale}/... 格式（48 个语言前缀），或者纯根路径
  if (/^\/[a-z]{2}\//.test(path) || path === "/" || path === "") {
    return matchesKnownRoute(path)
      ? { project: "site", isPage: true }
      : { project: "unknown", isPage: false };
  }
  // 不匹配任何已知路由架构 → 扫描器噪音 / 非法路径
  return { project: "unknown", isPage: false };
}

// ── Fetch functions ──────────────────────────────────────────────

/**
 * Fetch daily aggregated stats for one or more dates from CF.
 * For each date in the range [startDate, endDate], queries httpRequests1dGroups.
 *
 * NOTE: 1dGroups only lets us query a single date at a time with the `date` filter.
 * We query each date individually and batch them.
 */
export async function fetchDailyStats(
  zoneId: string,
  token: string,
  dates: string[],
): Promise<DailyStats[]> {
  if (!dates.length) return [];

  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const q = `{
    viewer {
      zones(filter: {zoneTag: "${zoneId}"}) {
        httpRequests1dGroups(limit: 366, filter: {date_geq: "${startDate}", date_leq: "${endDate}"}) {
          dimensions { date }
          sum {
            pageViews requests bytes cachedRequests
            countryMap { clientCountryName requests }
            browserMap { uaBrowserFamily pageViews }
            responseStatusMap { edgeResponseStatus requests }
          }
          uniq { uniques }
        }
      }
    }
  }`;

  let groups: any[] = [];
  try {
    const data = await graphql(q, token);
    groups = data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];
  } catch (err) {
    console.error(`[cf-analytics] fetchDailyStats range query failed:`, err);
    throw err;
  }

  // Build a map of date → group for easy lookup
  const groupByDate = new Map<string, any>();
  for (const g of groups) {
    const d = g?.dimensions?.date;
    if (d) groupByDate.set(d, g);
  }

  const results: DailyStats[] = [];
  for (const date of dates) {
    const g = groupByDate.get(date);
    if (!g) {
      // No data for this date
      results.push({
        date,
        pv: 0,
        uv: 0,
        requests: 0,
        bytes: 0,
        cachedRequests: 0,
        countryMap: [],
        browserMap: [],
        statusCodeMap: [],
      });
      continue;
    }

    const sum = g.sum || {};
    const uniq = g.uniq || {};

    results.push({
      date,
      pv: sum.pageViews || 0,
      uv: uniq.uniques || 0,
      requests: sum.requests || 0,
      bytes: sum.bytes || 0,
      cachedRequests: sum.cachedRequests || 0,
      countryMap: (sum.countryMap || []).map((c: any) => ({
        clientCountryName: c.clientCountryName || "",
        requests: c.requests || 0,
      })),
      browserMap: (sum.browserMap || []).map((b: any) => ({
        uaBrowserFamily: b.uaBrowserFamily || "",
        pageViews: b.pageViews || 0,
      })),
      statusCodeMap: (sum.responseStatusMap || []).map((s: any) => ({
        edgeResponseStatus: s.edgeResponseStatus || 0,
        requests: s.requests || 0,
      })),
    });
  }

  return results;
}

/**
 * Fetch hourly stats for a time range from CF.
 * Uses httpRequests1hGroups with datetime_geq/datetime_lt filter.
 */
export async function fetchHourlyStats(
  zoneId: string,
  token: string,
  startISO: string,
  endISO: string,
): Promise<HourlyStats[]> {
  const query = `{
    viewer {
      zones(filter: {zoneTag: "${zoneId}"}) {
        httpRequests1hGroups(
          limit: 500,
          filter: {datetime_geq: "${startISO}", datetime_lt: "${endISO}"}
        ) {
          dimensions { datetime }
          sum {
            pageViews requests
            countryMap { clientCountryName requests }
            browserMap { uaBrowserFamily pageViews }
          }
          uniq { uniques }
        }
      }
    }
  }`;

  const data = await graphql(query, token);
  const groups = data?.viewer?.zones?.[0]?.httpRequests1hGroups || [];

  return groups.map((g: any) => {
    const iso = g.dimensions?.datetime || "";
    // Parse "2026-07-06T14:00:00Z" → date=2026-07-06, hour=14
    const date = iso.slice(0, 10);
    const hour = parseInt(iso.slice(11, 13), 10) || 0;
    return {
      date,
      hour,
      pv: g.sum?.pageViews || 0,
      uv: g.uniq?.uniques || 0,
      requests: g.sum?.requests || 0,
      countryMap: (g.sum?.countryMap || []).map((c: any) => ({
        clientCountryName: c.clientCountryName || "",
        requests: c.requests || 0,
      })),
      browserMap: (g.sum?.browserMap || []).map((b: any) => ({
        uaBrowserFamily: b.uaBrowserFamily || "",
        pageViews: b.pageViews || 0,
      })),
    };
  });
}

/**
 * Fetch aggregate stats for a single hour using httpRequestsAdaptiveGroups.
 * Useful for today's completed hours.
 */
export async function fetchHourlyAggregateStats(
  zoneId: string,
  token: string,
  date: string,
  hour: number,
): Promise<AggregateStats> {
  const startISO = `${date}T${String(hour).padStart(2, "0")}:00:00Z`;
  const endISO = `${date}T${String(hour).padStart(2, "0")}:59:59Z`;

  const query = `{
    viewer {
      zones(filter: {zoneTag: "${zoneId}"}) {
        httpRequestsAdaptiveGroups(
          limit: 10000,
          filter: {datetime_geq: "${startISO}", datetime_lt: "${endISO}"}
        ) {
          dimensions { date clientRequestPath userAgentOS clientDeviceType clientCountryName clientBrowserFamily }
          count
        }
      }
    }
  }`;

  try {
    const resp = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    if (!resp.ok) {
      console.error(`[cf-analytics] fetchHourlyAggregateStats HTTP ${resp.status} for ${date} hour ${hour}`);
      return { osData: [], deviceData: [], pathData: [], projectData: [] };
    }
    const body = await resp.json();
    const groups = body?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || [];

    if (!groups || groups.length === 0) {
      return { osData: [], deviceData: [], pathData: [], projectData: [] };
    }

    const pathMap = new Map<string, number>();
    const osMap = new Map<string, number>();
    const deviceMap = new Map<string, number>();
    const projectMap = new Map<string, number>();

    for (const g of groups) {
      const dims = g.dimensions || {};
      const cnt = g.count || 0;

      const path = dims.clientRequestPath || "";
      if (path) {
        pathMap.set(path, (pathMap.get(path) || 0) + cnt);
        const { project } = inferProject(path);
        projectMap.set(project, (projectMap.get(project) || 0) + cnt);
      }

      const os = dims.userAgentOS || "Unknown";
      if (os) {
        osMap.set(os, (osMap.get(os) || 0) + cnt);
      }

      const device = dims.clientDeviceType || "unknown";
      if (device) {
        deviceMap.set(device, (deviceMap.get(device) || 0) + cnt);
      }
    }

    return {
      osData: Array.from(osMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([os, count]) => ({ os, count })),
      deviceData: Array.from(deviceMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([device, count]) => ({ device, count })),
      pathData: Array.from(pathMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 500)
        .map(([path, count]) => ({ path, count })),
      projectData: Array.from(projectMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([project, count]) => ({ project, count })),
    };
  } catch (err) {
    console.error(`[cf-analytics] fetchHourlyAggregateStats error for ${date} hour ${hour}:`, err);
    return { osData: [], deviceData: [], pathData: [], projectData: [] };
  }
}

/**
 * Fetch page paths (and inferred project / OS / device) from CF adaptive groups.
 * Uses httpRequestsAdaptiveGroups with clientRequestPath dimension.
 * Sampling: ~67% with just path dimension and limit=10000.
 */
/**
 * Fetch aggregate stats (page paths, OS, device) using httpRequestsAdaptiveGroups
 * (one query per date — the dataset has a 1-day time range limit).
 * Uses concurrency control (max 5 parallel requests) for efficiency.
 * Returns a Map<string, AggregateStats> keyed by date (YYYY-MM-DD).
 */
export async function fetchAggregateStatsRange(
  zoneId: string,
  token: string,
  startDate: string,
  endDate: string,
): Promise<Map<string, AggregateStats>> {
  const result = new Map<string, AggregateStats>();

  // Build the date list
  const start = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");
  const dates: string[] = [];
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }

  if (dates.length === 0) return result;

  const CONCURRENCY = 5;
  for (let i = 0; i < dates.length; i += CONCURRENCY) {
    const batch = dates.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (date) => {
        const query = `{
          viewer {
            zones(filter: {zoneTag: "${zoneId}"}) {
              httpRequestsAdaptiveGroups(
                limit: 10000,
                filter: {datetime_geq: "${date}T00:00:00Z", datetime_lt: "${date}T23:59:59Z"}
              ) {
                dimensions { date clientRequestPath userAgentOS clientDeviceType }
                count
              }
            }
          }
        }`;
        // Use direct fetch instead of graphql helper to match debug test pattern
        const resp = await fetch("https://api.cloudflare.com/client/v4/graphql", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${await resp.text().catch(() => "")}`);
        }
        const body = await resp.json();
        const groups = body?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || [];
        return { date, groups };
      }),
    );

    for (const r of batchResults) {
      if (r.status === "rejected") {
        console.error(`[cf-analytics] aggregate per-date call failed:`, r.reason);
        continue;
      }
      const { date: d, groups } = r.value;
      if (!groups || groups.length === 0) continue;

      const pathMap = new Map<string, number>();
      const osMap = new Map<string, number>();
      const deviceMap = new Map<string, number>();
      const projectMap = new Map<string, number>();

      for (const g of groups) {
        const dims = g.dimensions || {};
        const cnt = g.count || 0;

        const path = dims.clientRequestPath || "";
        if (path) {
          pathMap.set(path, (pathMap.get(path) || 0) + cnt);
          const { project } = inferProject(path);
          projectMap.set(project, (projectMap.get(project) || 0) + cnt);
        }

        const os = dims.userAgentOS || "Unknown";
        if (os) {
          osMap.set(os, (osMap.get(os) || 0) + cnt);
        }

        const device = dims.clientDeviceType || "unknown";
        if (device) {
          deviceMap.set(device, (deviceMap.get(device) || 0) + cnt);
        }
      }

      result.set(d, {
        osData: Array.from(osMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([os, count]) => ({ os, count })),
        deviceData: Array.from(deviceMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([device, count]) => ({ device, count })),
        pathData: Array.from(pathMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 500)
          .map(([path, count]) => ({ path, count })),
        projectData: Array.from(projectMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([project, count]) => ({ project, count })),
      });
    }
  }

  return result;
}

// Legacy single-date aggregate fetch (kept for backward compat)
export async function fetchAggregateStats(
  zoneId: string,
  token: string,
  date: string,
): Promise<AggregateStats> {
  const map = await fetchAggregateStatsRange(zoneId, token, date, date);
  return map.get(date) || { osData: [], deviceData: [], pathData: [], projectData: [] };
}

// ── Env helpers ──────────────────────────────────────────────────

export function getZoneId(env: any): string {
  return env.CLOUDFLARE_ZONE_ID || "";
}

export function getApiToken(env: any): string {
  return env.CLOUDFLARE_API_TOKEN || "";
}

export function hasConfig(env: any): boolean {
  return !!(env.CLOUDFLARE_ZONE_ID && env.CLOUDFLARE_API_TOKEN);
}
