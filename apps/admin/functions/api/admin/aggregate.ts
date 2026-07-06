/**
 * Manual daily aggregation trigger
 * POST /api/admin/aggregate
 *
 * Triggers immediate aggregation of unaggregated page_views data.
 * Admin session required.
 *
 * Response:
 *   { ok: true, aggregated: ["2026-07-06", ...], message: "已聚合 ... 天数据" }
 */

import { requireAdmin } from "../../lib/admin-session";
import { maybeAggregate } from "../../lib/aggregate";

export async function onRequest(context: { request: Request; env: any }) {
  // ── Auth ──
  try {
    await requireAdmin(context.request, context.env);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Only POST ──
  if (context.request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  // ── Run aggregation ──
  try {
    const aggregated = await maybeAggregate(context.env);

    return Response.json({
      ok: true,
      aggregated,
      message:
        aggregated.length > 0
          ? `已聚合 ${aggregated.length} 天数据: ${aggregated.join(", ")}`
          : "暂无需要聚合的数据，所有历史数据已完成聚合",
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
