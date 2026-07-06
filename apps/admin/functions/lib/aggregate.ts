/**
 * Daily page view aggregation logic.
 *
 * Aggregates `page_views` rows into `daily_page_stats` (1 row per day as JSON),
 * then deletes the aggregated detail rows to conserve D1 storage.
 *
 * Called lazily by analytics.ts (on dashboard load) and manually via POST /api/admin/aggregate.
 *
 * Idempotent: uses INSERT OR IGNORE so re-running is safe.
 */

interface Env {
  DB: any;
}

/**
 * Get the current UTC date as YYYY-MM-DD.
 * The system uses UTC throughout, matching the existing analytics code.
 */
function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Check whether `daily_page_stats` has any row at all.
 * Used as a hint for the initial backfill.
 */
async function hasAnyDailyStats(env: Env): Promise<boolean> {
  const row: any = await env.DB.prepare("SELECT 1 FROM daily_page_stats LIMIT 1").first();
  return !!row;
}

/**
 * Find and aggregate every date in `page_views` that is NOT yet in
 * `daily_page_stats` and is BEFORE the current UTC date.
 *
 * After aggregation, the detail rows for that date are deleted.
 *
 * Returns the list of aggregated date strings.
 */
export async function maybeAggregate(env: Env): Promise<string[]> {
  const today = getTodayUTC();

  // Distinct dates in page_views before today
  const unaggregated: any = await env.DB.prepare(
    `SELECT DISTINCT DATE(created_at) as date
     FROM page_views
     WHERE DATE(created_at) < ?
     ORDER BY date ASC`
  ).bind(today).all();

  if (!unaggregated.results || unaggregated.results.length === 0) {
    return [];
  }

  const aggregated: string[] = [];

  for (const row of unaggregated.results) {
    const date = row.date;

    // Skip if already aggregated (idempotent)
    const existing: any = await env.DB.prepare(
      "SELECT date FROM daily_page_stats WHERE date = ?"
    ).bind(date).first();

    if (existing) {
      // Already aggregated — just clean up stale detail rows
      await env.DB.prepare("DELETE FROM page_views WHERE DATE(created_at) = ?")
        .bind(date)
        .run();
      continue;
    }

    await aggregateDate(env, date);
    aggregated.push(date);
  }

  return aggregated;
}

/**
 * Aggregate a single day's `page_views` into one `daily_page_stats` row.
 * Computes: total PV/UV, hourly breakdown, geo, page, channel, project stats.
 * Then deletes the original page_views rows for that date.
 */
async function aggregateDate(env: Env, date: string): Promise<void> {
  // ── Totals ──
  const total: any = await env.DB.prepare(
    "SELECT COUNT(*) as pv FROM page_views WHERE DATE(created_at) = ?"
  ).bind(date).first();

  const uv: any = await env.DB.prepare(
    "SELECT COUNT(DISTINCT user_agent) as uv FROM page_views WHERE DATE(created_at) = ? AND user_agent != ''"
  ).bind(date).first();

  const countries: any = await env.DB.prepare(
    "SELECT COUNT(DISTINCT country) as count FROM page_views WHERE DATE(created_at) = ? AND country != '' AND country IS NOT NULL"
  ).bind(date).first();

  // ── Hourly PV ──
  const hourlyRaw: any = await env.DB.prepare(
    `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour,
            COUNT(*) as pv
     FROM page_views
     WHERE DATE(created_at) = ?
     GROUP BY hour
     ORDER BY hour`
  ).bind(date).all();

  // ── Hourly UV ──
  const uvHourly: any = await env.DB.prepare(
    `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour,
            COUNT(DISTINCT user_agent) as uv
     FROM page_views
     WHERE DATE(created_at) = ? AND user_agent != ''
     GROUP BY hour
     ORDER BY hour`
  ).bind(date).all();

  const pvMap = new Map((hourlyRaw.results || []).map((r: any) => [r.hour, r.pv]));
  const uvMap = new Map((uvHourly.results || []).map((r: any) => [r.hour, r.uv]));

  const hourlyData: { hour: number; pv: number; uv: number }[] = [];
  for (let h = 0; h < 24; h++) {
    hourlyData.push({
      hour: h,
      pv: Number(pvMap.get(h) || 0),
      uv: Number(uvMap.get(h) || 0),
    });
  }

  // ── Page breakdown ──
  const pagesRaw: any = await env.DB.prepare(
    `SELECT path, COUNT(*) as count
     FROM page_views
     WHERE DATE(created_at) = ?
     GROUP BY path
     ORDER BY count DESC`
  ).bind(date).all();

  // ── Geographic distribution ──
  const geoRaw: any = await env.DB.prepare(
    `SELECT country, COUNT(*) as count
     FROM page_views
     WHERE DATE(created_at) = ? AND country != '' AND country IS NOT NULL
     GROUP BY country
     ORDER BY count DESC`
  ).bind(date).all();

  // ── Channel source ──
  const channelRaw: any = await env.DB.prepare(
    `SELECT
      CASE
        WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
        WHEN referrer LIKE '%google.%' OR referrer LIKE '%bing.%' OR referrer LIKE '%baidu.%' OR referrer LIKE '%yandex.%' OR referrer LIKE '%duckduckgo.%' OR referrer LIKE '%sogou.%' OR referrer LIKE '%360.%' THEN 'Search'
        WHEN referrer LIKE '%facebook.%' OR referrer LIKE '%twitter.%' OR referrer LIKE '%x.com%' OR referrer LIKE '%linkedin.%' OR referrer LIKE '%instagram.%' OR referrer LIKE '%pinterest.%' OR referrer LIKE '%reddit.%' OR referrer LIKE '%weixin.%' OR referrer LIKE '%weibo.%' OR referrer LIKE '%youtube.%' THEN 'Social'
        WHEN referrer LIKE '%sinotradecompliance.%' OR referrer LIKE '%compli-service.%' OR referrer LIKE '%trade-web-%' THEN 'Internal'
        ELSE 'Referral'
      END AS channel,
      COUNT(*) as count
     FROM page_views
     WHERE DATE(created_at) = ?
     GROUP BY channel
     ORDER BY count DESC`
  ).bind(date).all();

  // ── Project breakdown ──
  const projectRaw: any = await env.DB.prepare(
    `SELECT project, COUNT(*) as count
     FROM page_views
     WHERE DATE(created_at) = ?
     GROUP BY project
     ORDER BY count DESC`
  ).bind(date).all();

  // ── Write daily stats row ──
  await env.DB.prepare(
    `INSERT OR IGNORE INTO daily_page_stats
     (date, total_pv, total_uv, countries_count, hourly_data, geo_data, page_data, channel_data, project_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      date,
      Number(total?.pv || 0),
      Number(uv?.uv || 0),
      Number(countries?.count || 0),
      JSON.stringify(hourlyData),
      JSON.stringify(geoRaw.results || []),
      JSON.stringify(pagesRaw.results || []),
      JSON.stringify(channelRaw.results || []),
      JSON.stringify(projectRaw.results || []),
    )
    .run();

  // ── Delete the now-aggregated detail rows ──
  await env.DB.prepare("DELETE FROM page_views WHERE DATE(created_at) = ?")
    .bind(date)
    .run();
}
