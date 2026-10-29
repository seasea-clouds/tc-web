/**
 * Minimal Cloudflare Workers types for tc-web-cron Worker.
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
