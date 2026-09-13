/**
 * Minimal Cloudflare Workers types for email-cron Worker.
 * （沿用 apps/admin/workers/analytics-cron/src/types.d.ts 的做法：
 *   Workers 运行时全局类型不在 Next.js 的 lib 里，声明最小集合即可）
 */
interface ScheduledEvent {
  readonly cron: string;
  readonly scheduledTime: number;
  readonly type: "scheduled";
}
interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}
