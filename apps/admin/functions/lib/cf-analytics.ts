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
async function graphql(query: string, token: string): Promise<any> {
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

/** Infer project name from a request path. */
function inferProject(path: string): string {
  if (path.startsWith("/c/") || path.includes("/c/")) return "portal";
  if (path.startsWith("/en/c/") || path.startsWith("/zh/c/")) return "portal";
  if (path.startsWith("/admin/")) return "admin";
  if (path.startsWith("/blog/")) return "blog";
  if (path.startsWith("/api/")) return "api";
  // Portal also has paths like /{locale}/c/...
  if (/^\/[a-z]{2}\/c\//.test(path)) return "portal";
  // Blog paths: /{locale}/blog/...
  if (/^\/[a-z]{2}\/blog\//.test(path)) return "blog";
  return "site";
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

  // Build a union query for all dates
  const dateFilters = dates
    .map((d) => `{date: "${d}"}`)
    .join(" OR ");

  const query = `{
    viewer {
      zones(filter: {zoneTag: "${zoneId}"}) {
        httpRequests1dGroups(
          limit: ${dates.length},
          filter: {date_gt: "${dates[0] === dates[dates.length-1] ? dates[0] : dateFilters}"}
        ) {
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

  // Hmm, the filter needs to handle multiple dates. Let me use OR filter.
  // Actually, let me just query one date at a time for reliability.
  const results: DailyStats[] = [];
  for (const date of dates) {
    try {
      const q = `{
        viewer {
          zones(filter: {zoneTag: "${zoneId}"}) {
            httpRequests1dGroups(limit: 1, filter: {date: "${date}"}) {
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

      const data = await graphql(q, token);
      const groups = data?.viewer?.zones?.[0]?.httpRequests1dGroups;
      if (!groups || groups.length === 0) {
        // No data for this date (future or no traffic)
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

      const g = groups[0];
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
    } catch (err) {
      // Log and return empty for this date (don't break the whole batch)
      console.error(`[cf-analytics] fetchDailyStats failed for ${date}:`, err);
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
): Promise<HourlyStats[]> {
  const query = `{
    viewer {
      zones(filter: {zoneTag: "${zoneId}"}) {
        httpRequests1hGroups(
          limit: 100,
          filter: {datetime_geq: "${startISO}", datetime_lt: "${endISO}"}
        ) {
          dimensions { datetime }
          sum { pageViews requests }
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
    };
  });
}

/**
 * Fetch page paths (and inferred project / OS / device) from CF adaptive groups.
 * Uses httpRequestsAdaptiveGroups with clientRequestPath dimension.
 * Sampling: ~67% with just path dimension and limit=500.
 */
/**
 * Fetch aggregate stats (page paths, OS, device) for an ENTIRE date range
 * in a SINGLE GraphQL call, grouped by date dimension.
 * Returns a Map<string, AggregateStats> keyed by date (YYYY-MM-DD).
 */
export async function fetchAggregateStatsRange(
  zoneId: string,
  token: string,
  startDate: string,
  endDate: string,
): Promise<Map<string, AggregateStats>> {
  const result = new Map<string, AggregateStats>();

  // Query across the full range, grouped by date
  const query = `{
    viewer {
      zones(filter: {zoneTag: "${zoneId}"}) {
        httpRequestsAdaptiveGroups(
          limit: 2000,
          filter: {datetime_geq: "${startDate}T00:00:00Z", datetime_lt: "${endDate}T23:59:59Z"}
        ) {
          dimensions { date clientRequestPath clientOS clientDeviceType }
          count
        }
      }
    }
  }`;

  const data = await graphql(query, token);
  const groups = data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || [];

  // Per-date accumulators
  const dateBuckets = new Map<string, {
    pathMap: Map<string, number>;
    osMap: Map<string, number>;
    deviceMap: Map<string, number>;
    projectMap: Map<string, number>;
  }>();

  for (const g of groups) {
    const dims = g.dimensions || {};
    const cnt = g.count || 0;
    const date = dims.date || "";
    if (!date) continue;

    let bucket = dateBuckets.get(date);
    if (!bucket) {
      bucket = { pathMap: new Map(), osMap: new Map(), deviceMap: new Map(), projectMap: new Map() };
      dateBuckets.set(date, bucket);
    }

    // Path
    const path = dims.clientRequestPath || "";
    if (path) {
      bucket.pathMap.set(path, (bucket.pathMap.get(path) || 0) + cnt);
      // Project from path
      const project = inferProject(path);
      bucket.projectMap.set(project, (bucket.projectMap.get(project) || 0) + cnt);
    }

    // OS — try clientOS first, fallback to userAgentOS for older schema
    const os = dims.clientOS || dims.userAgentOS || "Unknown";
    if (os) {
      bucket.osMap.set(os, (bucket.osMap.get(os) || 0) + cnt);
    }

    // Device
    const device = dims.clientDeviceType || dims.clientDevice || "unknown";
    if (device) {
      bucket.deviceMap.set(device, (bucket.deviceMap.get(device) || 0) + cnt);
    }
  }

  // Build result map
  for (const [date, bucket] of Array.from(dateBuckets.entries())) {
    result.set(date, {
      osData: Array.from(bucket.osMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([os, count]) => ({ os, count })),
      deviceData: Array.from(bucket.deviceMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([device, count]) => ({ device, count })),
      pathData: Array.from(bucket.pathMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([path, count]) => ({ path, count })),
      projectData: Array.from(bucket.projectMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([project, count]) => ({ project, count })),
    });
  }

  return result;
}

// Legacy single-date aggregate fetch (kept for reference, use fetchAggregateStatsRange instead)
export async function fetchAggregateStats(
  zoneId: string,
  token: string,
  date: string,
): Promise<AggregateStats> {
  // Fall back to per-date for backward compat, but prefer range-based
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
