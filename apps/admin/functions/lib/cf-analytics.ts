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
  /**
   * 仅 200 响应码的独立访客与请求数。
   * CF 的 `uniq.uniques` 是数据集级去重、无法按状态码切分，
   * 只能用 adaptiveGroups 按 clientIP 分组数个数（见 fetchStatus200Window）。
   */
  uv200?: number;
  requests200?: number;
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
  /** 仅 200：独立访客 / 请求数（口径同 DailyStats.uv200） */
  uv200?: number;
  requests200?: number;
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
 * 路由合法性判定：以 HTTP 状态码为准（动态）。
 *
 * 【设计原则】不维护任何静态路径名单。
 * - 查询 CF Analytics 时（fetchAggregateStatsRange / fetchHourlyAggregateStats）
 *   按 edgeResponseStatus 过滤，仅统计 2xx/3xx 请求。
 * - 真实页面 / 未来新增页面 / 新增子站：存在即返回 200/3xx → 自动进入统计；
 * - 扫描器探测的不存在路径：全部返回 404 → 自动排除。
 * - 因此新增路径或子站无需修改本文件，自动被识别。
 */

/**
 * 路由架构识别 —— 判断一个请求路径属于哪个子站（仅用于项目分布统计与
 * 「热门页面」的 isPage 判定；不再用于路径合法性过滤）。
 *
 * 返回值：
 *   project  子站标识（admin / api / portal / insights / site / unknown）
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
    return { project: "portal", isPage: true };
  }
  // Insights 站 — 对外页面，计入热门页面
  if (path.startsWith("/insights/") || /^\/[a-z]{2}\/insights\//.test(path)) {
    return { project: "insights", isPage: true };
  }
  // 官网主站（Site）— 对外页面，计入热门页面
  // 必须是 /{locale}/... 格式（语言前缀，含无尾斜杠的 locale-only 首页 /en），
  // 或者纯根路径；具体路径是否存在由 HTTP 状态码判定，不在此处枚举。
  if (/^\/[a-z]{2}(\/|$)/.test(path) || path === "/" || path === "") {
    return { project: "site", isPage: true };
  }
  // 不匹配任何已知路由架构 → 扫描器噪音 / 非法路径
  return { project: "unknown", isPage: false };
}

// ── Fetch functions ──────────────────────────────────────────────

/**
 * 只统计 **200 响应码** 的真实访问。
 *
 * 为什么不用 1dGroups：`uniq.uniques` 是「数据集级去重」，没有状态码维度，
 * 无法回答「其中 200 的独立访客有多少」；`sum.pageViews` 也只覆盖 HTML 文档。
 * 唯一可行的口径是 adaptiveGroups 按 `clientIP` 分组：
 *   独立访客 = 分组数，请求数 = 各组 count 之和。
 *
 * 实测（2026-11-23，一天）：4862 个独立 IP，count 求和 = 12337，
 * 与同日「仅 200 的请求总数」完全一致 → 数据完整、无采样截断；
 * limit 上限 10000，命中上限时返回 truncated=true（调用方应降级处理）。
 *
 * @param startISO 窗口起点，如 2026-11-23T00:00:00Z
 * @param endISO   窗口终点，如 2026-11-23T23:59:59Z
 */
export interface Status200Stats {
  uv: number;
  requests: number;
  truncated: boolean;
  /**
   * 数据是否可信。CF 的高基数维度（clientIP）只保留约 22 天，
   * 更早的窗口会被裁剪成少量 IP + 超高单 IP 计数
   * （实测 2026-10-30：277 个 IP 承担 8050 请求，均值 29/28）。
   * 判据：请求/IP 均值 > 8 即认定被裁剪 → 调用方不要落库。
   */
  reliable: boolean;
}

export async function fetchStatus200Window(
  zoneId: string,
  token: string,
  startISO: string,
  endISO: string,
): Promise<Status200Stats> {
  const q = `{
    viewer {
      zones(filter: {zoneTag: "${zoneId}"}) {
        httpRequestsAdaptiveGroups(
          limit: 10000,
          filter: {datetime_geq: "${startISO}", datetime_lt: "${endISO}", edgeResponseStatus: 200}
        ) {
          count
          dimensions { clientIP }
        }
      }
    }
  }`;
  const data = await graphql(q, token);
  const groups = data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || [];
  let requests = 0;
  for (const g of groups) requests += g.count || 0;
  const avg = groups.length > 0 ? requests / groups.length : 0;
  return {
    uv: groups.length,
    requests,
    truncated: groups.length >= 10000,
    reliable: groups.length > 0 && avg <= 8,
  };
}

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
  opts: { status200?: boolean } = {},
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

  // 200 口径：逐日查询（跨天去重会破坏「各天相加」的既定口径，必须按天）
  if (opts.status200 && results.length > 0) {
    const CONCURRENCY = 4;
    for (let i = 0; i < results.length; i += CONCURRENCY) {
      const batch = results.slice(i, i + CONCURRENCY);
      const settled = await Promise.allSettled(
        batch.map((r) =>
          fetchStatus200Window(zoneId, token, `${r.date}T00:00:00Z`, `${r.date}T23:59:59Z`),
        ),
      );
      settled.forEach((res, idx) => {
        if (res.status === "fulfilled") {
          if (res.value.reliable) {
            batch[idx].uv200 = res.value.uv;
            batch[idx].requests200 = res.value.requests;
          } else {
            // 超出 clientIP 保留窗口 → 留空，读取端会回退/提示，绝不写假数
            console.warn(`[cf-analytics] status200 ${batch[idx].date} unreliable (clipped), skipped`);
          }
        } else {
          console.error(`[cf-analytics] status200 daily ${batch[idx].date} failed:`, res.reason);
        }
      });
    }
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
  opts: { status200?: boolean } = {},
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

  const rows: HourlyStats[] = groups.map((g: any) => {
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

  if (opts.status200 && rows.length > 0) {
    // 每小时独立窗口查一次；补缺失小时通常只有 1 个，成本很低
    const settled = await Promise.allSettled(
      rows.map((r) => {
        const hh = String(r.hour).padStart(2, "0");
        return fetchStatus200Window(zoneId, token, `${r.date}T${hh}:00:00Z`, `${r.date}T${hh}:59:59Z`);
      }),
    );
    settled.forEach((res, idx) => {
      if (res.status === "fulfilled" && res.value.reliable) {
        rows[idx].uv200 = res.value.uv;
        rows[idx].requests200 = res.value.requests;
      } else if (res.status === "rejected") {
        console.error(`[cf-analytics] status200 hourly ${rows[idx].date}T${rows[idx].hour} failed:`, res.reason);
      }
    });
  }

  return rows;
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
          dimensions { date clientRequestPath userAgentOS clientDeviceType edgeResponseStatus }
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

      // 动态合法性判定：只统计 200（同 fetchAggregateStatsRange）。
      const status = dims.edgeResponseStatus || 0;
      if (status !== 200) continue;

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
                dimensions { date clientRequestPath userAgentOS clientDeviceType edgeResponseStatus }
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

        // 动态合法性判定：只统计 **200**。
        // 真实页面返回 200 → 自动收录；扫描器探测的不存在路径返回 404 → 自动排除；
        // 304 是缓存协商（不是新的页面浏览）、3xx 是重定向，按口径一律不计。
        const status = dims.edgeResponseStatus || 0;
        if (status !== 200) continue;

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
