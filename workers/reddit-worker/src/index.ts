/**
 * Reddit 采集链路的哑存储 Worker。
 *
 * 契约：docs/reddit-plan-v2/01-CONTRACT.md（唯一事实源）
 * 施工单：docs/reddit-plan-v2/05-WORKER-PLAN.md
 *
 * 只做四件事：收信封（push）→ 发未 ack 的（pull）→ 删已 ack 的（ack）→ 每日清理。
 * 不解析、不合并、不派生字段、不改正文 —— 那些全在 CRM 侧。
 *
 * 入口路径：/reddit/<win>/(push|pull|ack)，由主域边缘 worker 原样转发进来；
 * 转发层会额外注入 X-RD-Gateway 与 X-RD-Client-IP（不参与签名）。
 */

// ── 最小 D1 类型（避免为一个 Worker 引入 workers-types 依赖）──────────────
type D1Meta = { changes: number; last_row_id: number };
type D1Result<T = unknown> = { results: T[]; success: boolean; meta: D1Meta };
interface D1Prepared {
  bind(...values: unknown[]): D1Prepared;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}
interface D1Database {
  prepare(query: string): D1Prepared;
  batch<T = unknown>(statements: D1Prepared[]): Promise<D1Result<T>[]>;
}
interface Env {
  DB: D1Database;
  REDDIT_PUBKEYS: string;
  REDDIT_GATEWAY_SECRET: string;
}

// ── 契约常量 ──────────────────────────────────────────────────────────
const PREFIX = '/reddit';
const WINDOW_S = 300; // 时间窗 5 分钟，同时接受上一个窗口
const TS_SKEW_S = 300; // X-RD-Ts 与服务器时间差上限
const MAX_BODY = 2 * 1024 * 1024; // 2 MB → 413
const QUEUE_MAX = 5000; // 未 ack 队列上限 → 429
const IP_PER_MIN = 60; // 每 IP 每分钟 push 上限 → 429
const NONCE_TTL = 600; // nonce 保留 600s
const UNACKED_KEEP_DAYS = 30;
const ACKED_KEEP_DAYS = 7;

const ROLE_ENDPOINTS: Record<string, string[]> = {
  script: ['push'],
  crm: ['pull', 'ack'],
};

const PATH_RE = /^\/reddit\/([0-9a-f]{16})\/(push|pull|ack)\/?$/;

// ── 基础工具 ──────────────────────────────────────────────────────────
const deny = () => json(404, { ok: false });
const tooLarge = () => json(413, { ok: false });
const tooMany = () => json(429, { ok: false });

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-robots-tag': 'noindex' },
  });
}

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function b64uToBytes(s: string): Uint8Array | null {
  try {
    const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', bytes));
}

/** win = hex(SHA256("path:" + floor(unix/300)))[:16]（与 CRM/脚本同款） */
async function windowId(unixSec: number): Promise<string> {
  const w = Math.floor(unixSec / WINDOW_S);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`path:${w}`));
  return hex(digest).slice(0, 16);
}

type Pubkeys = Record<string, JsonWebKey>;

/**
 * 验签：ES256，**只收 64 字节 r||s**（用户 2026-10-22 定，不收 DER）。
 * WebCrypto 的 ECDSA 签名格式原生就是 r||s，两端零转换。
 */
async function verifySignature(
  pubkeys: Pubkeys,
  role: string,
  sigB64: string,
  message: Uint8Array,
): Promise<boolean> {
  const jwk = pubkeys[role];
  if (!jwk) return false;
  const sig = b64uToBytes(sigB64);
  if (!sig || sig.length !== 64) return false;
  try {
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, sig, message);
  } catch {
    return false;
  }
}

function log(entry: Record<string, unknown>): void {
  // 不打完整信封（正文是客户数据）
  console.log(JSON.stringify({ svc: 'tc-web-reddit', ...entry }));
}

// ── 主入口 ────────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ① 网关头（弱方案）：比验签更早，不查 D1，外部直连一律 404
    if (!env.REDDIT_GATEWAY_SECRET || request.headers.get('X-RD-Gateway') !== env.REDDIT_GATEWAY_SECRET) {
      return deny();
    }

    // OPTIONS 等其它方法：本版不做 CORS，一律 404
    const m = PATH_RE.exec(url.pathname);
    if (!m) return deny();
    const [, win, action] = m;
    if (request.method !== (action === 'pull' ? 'GET' : 'POST')) return deny();

    // ② 路径窗口：只认当前与上一个
    const now = Math.floor(Date.now() / 1000);
    const [cur, prev] = await Promise.all([windowId(now), windowId(now - WINDOW_S)]);
    if (win !== cur && win !== prev) return deny();

    // ③ 头与时间戳
    const h = request.headers;
    const tsRaw = h.get('X-RD-Ts') || '';
    const nonce = h.get('X-RD-Nonce') || '';
    const dev = h.get('X-RD-Dev') || '';
    const role = h.get('X-RD-Role') || '';
    const sig = h.get('X-RD-Sig') || '';
    if (!tsRaw || !dev || !sig || !role) return deny();
    const ts = Date.parse(tsRaw);
    if (!Number.isFinite(ts) || Math.abs(now - Math.floor(ts / 1000)) > TS_SKEW_S) return deny();

    // ④ 角色与端点匹配
    if (!(ROLE_ENDPOINTS[role] || []).includes(action)) return deny();
    if (action !== 'pull' && !nonce) return deny();

    // ⑤ body：必须按**收到的原始字节**算哈希（绝不 JSON.parse 后重序列化）
    let bodyBytes = new Uint8Array(0);
    if (action !== 'pull') {
      const declared = Number(h.get('content-length') || 0);
      if (declared > MAX_BODY) return tooLarge();
      const raw = await request.arrayBuffer();
      if (raw.byteLength > MAX_BODY) return tooLarge();
      bodyBytes = new Uint8Array(raw);
    }

    // ⑥ nonce 未用过（先查后写：先验签通过再落库，避免未认证请求灌表）
    if (action !== 'pull') {
      const seen = await env.DB.prepare('SELECT 1 AS x FROM rd_nonce WHERE dev = ? AND nonce = ?')
        .bind(dev, nonce)
        .first<{ x: number }>();
      if (seen) return deny();
    }

    // ⑦ 验签（签名原文：METHOD\nPATH\nTS\nNONCE\nDEV\nsha256hex(body)）
    const canonical = [
      request.method.toUpperCase(),
      url.pathname,
      tsRaw,
      nonce,
      dev,
      await sha256Hex(bodyBytes),
    ].join('\n');
    let pubkeys: Pubkeys;
    try {
      pubkeys = JSON.parse(env.REDDIT_PUBKEYS || '{}') as Pubkeys;
    } catch {
      log({ ev: 'pubkeys_parse_error' });
      return deny();
    }
    if (!(await verifySignature(pubkeys, role, sig, new TextEncoder().encode(canonical)))) return deny();

    // 通过验签 → 落 nonce（并发重放：UNIQUE 冲突 → changes=0 → 404）
    if (action !== 'pull') {
      const ins = await env.DB
        .prepare('INSERT INTO rd_nonce (dev, nonce, expires_at) VALUES (?, ?, ?) ON CONFLICT(dev, nonce) DO NOTHING')
        .bind(dev, nonce, now + NONCE_TTL)
        .run();
      if ((ins.meta?.changes ?? 0) === 0) return deny();
      // 惰性清理过期 nonce（成本极低，顺带做）
      await env.DB.prepare('DELETE FROM rd_nonce WHERE expires_at < ?').bind(now).run();
    }

    if (action === 'push') return handlePush(env, request, bodyBytes, dev, role, now);
    if (action === 'pull') return handlePull(env, url);
    return handleAck(env, bodyBytes, now);
  },

  /** 每日清理：未 ack 30 天 / 已 ack 7 天物理删 / 过期 nonce / 限流桶 */
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const day = 86400;
    const stmts = [
      env.DB.prepare('DELETE FROM rd_envelope WHERE acked_at IS NOT NULL AND acked_at < ?').bind(now - ACKED_KEEP_DAYS * day),
      env.DB.prepare('DELETE FROM rd_envelope WHERE acked_at IS NULL AND received_at < ?').bind(now - UNACKED_KEEP_DAYS * day),
      env.DB.prepare('DELETE FROM rd_nonce WHERE expires_at < ?').bind(now),
      env.DB.prepare('DELETE FROM rd_rate'),
    ];
    const res = await env.DB.batch(stmts);
    log({ ev: 'cleanup', deleted: res.map((r) => r.meta?.changes ?? 0) });
  },
};

// ── push ──────────────────────────────────────────────────────────────
async function handlePush(
  env: Env,
  request: Request,
  bodyBytes: Uint8Array,
  dev: string,
  role: string,
  now: number,
): Promise<Response> {
  // 队列深度
  const depth = await env.DB.prepare('SELECT COUNT(*) AS c FROM rd_envelope WHERE acked_at IS NULL')
    .first<{ c: number }>();
  if ((depth?.c ?? 0) >= QUEUE_MAX) {
    log({ ev: 'push', status: 429, reason: 'queue_full' });
    return tooMany();
  }

  // 每 IP 每分钟（IP 由转发层注入；拿不到时退回按 dev 计数，dev 在签名内不可伪造）
  const ip = request.headers.get('X-RD-Client-IP') || `dev:${dev}`;
  const bucket = `${ip}:${Math.floor(now / 60)}`;
  const rateRes = await env.DB
    .prepare('INSERT INTO rd_rate (k, n) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET n = n + 1 RETURNING n')
    .bind(bucket)
    .all<{ n: number }>();
  const rate = rateRes.results?.[0];
  if ((rate?.n ?? 0) > IP_PER_MIN) {
    log({ ev: 'push', status: 429, reason: 'rate' });
    return tooMany();
  }

  const text = new TextDecoder().decode(bodyBytes);

  // capture_id 必填（worker 不做业务解析，但幂等键必须能拿到）
  let captureId = '';
  try {
    const parsed = JSON.parse(text) as { capture_id?: unknown };
    if (typeof parsed?.capture_id === 'string') captureId = parsed.capture_id;
  } catch {
    /* 非法 JSON 也照存：缺字段是 CRM 的事 */
  }
  if (!captureId) {
    // 没有幂等键就没法去重，也没法 ack → 按契约当非法请求处理
    log({ ev: 'push', status: 404, reason: 'no_capture_id' });
    return deny();
  }

  const ins = await env.DB
    .prepare('INSERT INTO rd_envelope (capture_id, received_at, device, role, body) VALUES (?, ?, ?, ?, ?) ON CONFLICT(capture_id) DO NOTHING')
    .bind(captureId, now, dev, role, text)
    .run();

  const rev = ins.meta.last_row_id;
  if ((ins.meta?.changes ?? 0) === 0) {
    // 已存在 → dup，rev 不变
    const row = await env.DB.prepare('SELECT rev FROM rd_envelope WHERE capture_id = ?')
      .bind(captureId)
      .first<{ rev: number }>();
    const dupRev = row?.rev ?? (await currentRev(env));
    log({ ev: 'push', status: 200, dup: true, rev: dupRev, capture_id: captureId });
    return json(200, { ok: true, dup: true, rev: dupRev });
  }

  log({ ev: 'push', status: 200, rev, capture_id: captureId, device: dev });
  return json(200, { ok: true, rev });
}

// ── pull ──────────────────────────────────────────────────────────────
async function handlePull(env: Env, url: URL): Promise<Response> {
  const sinceRaw = Number(url.searchParams.get('since_rev') ?? '0');
  const limitRaw = Number(url.searchParams.get('limit') ?? '50');
  const since = Number.isFinite(sinceRaw) && sinceRaw > 0 ? Math.floor(sinceRaw) : 0;
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 50, 1), 200);

  const rows = await env.DB
    .prepare('SELECT rev, body FROM rd_envelope WHERE acked_at IS NULL AND rev > ? ORDER BY rev ASC LIMIT ?')
    .bind(since, limit)
    .all<{ rev: number; body: string }>();

  const items = (rows.results || []).map((r) => {
    try {
      return JSON.parse(r.body) as unknown;
    } catch {
      return { rev: r.rev, raw: r.body }; // 原样兜底，不丢数据
    }
  });

  const lastRev = rows.results?.length ? rows.results[rows.results.length - 1].rev : since;
  let hasMore = false;
  if (rows.results?.length === limit) {
    const more = await env.DB
      .prepare('SELECT 1 AS x FROM rd_envelope WHERE acked_at IS NULL AND rev > ? LIMIT 1')
      .bind(lastRev)
      .first<{ x: number }>();
    hasMore = !!more;
  }

  const rev = await currentRev(env);
  log({ ev: 'pull', status: 200, items: items.length, has_more: hasMore, rev });
  return json(200, { ok: true, rev, items, has_more: hasMore });
}

// ── ack ───────────────────────────────────────────────────────────────
async function handleAck(env: Env, bodyBytes: Uint8Array, now: number): Promise<Response> {
  let ids: string[] = [];
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bodyBytes)) as { capture_ids?: unknown };
    if (Array.isArray(parsed?.capture_ids)) {
      ids = parsed.capture_ids.filter((x): x is string => typeof x === 'string' && x.length > 0);
    }
  } catch {
    return deny();
  }
  if (!ids.length) return json(200, { ok: true, acked: 0, rev: await currentRev(env) });

  const capped = ids.slice(0, 500); // 单次上限，防超大 IN 列表
  const placeholders = capped.map(() => '?').join(',');
  const upd = await env.DB
    .prepare(`UPDATE rd_envelope SET acked_at = ? WHERE acked_at IS NULL AND capture_id IN (${placeholders})`)
    .bind(now, ...capped)
    .run();

  const acked = upd.meta?.changes ?? 0;
  const rev = await currentRev(env);
  log({ ev: 'ack', status: 200, acked, rev });
  return json(200, { ok: true, acked, rev });
}

async function currentRev(env: Env): Promise<number> {
  const row = await env.DB.prepare('SELECT COALESCE(MAX(rev), 0) AS r FROM rd_envelope').first<{ r: number }>();
  return row?.r ?? 0;
}
