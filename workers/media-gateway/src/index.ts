/**
 * 媒体网关（Media Gateway）—— 多渠道采集链路的哑存储 Worker。
 *
 * 只做四件事：收信封（push）→ 发未 ack 的（pull）→ 删已 ack 的（ack）→ 每日清理。
 * 不解析、不合并、不派生字段、不改正文 —— 那些全在 CRM 侧。
 *
 * 入口路径：/media/<channel>/<win>/(push|pull|ack)，由主域边缘 worker 原样转发进来；
 * 转发层会额外注入 X-MG-Gateway 与 X-MG-Client-IP（不参与签名）。
 *
 * channel 白名单来自 MEDIA_CHANNELS，不在名单内一律 404（不提示原因）。
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
  MEDIA_PUBKEYS: string;
  MEDIA_GATEWAY_SECRET: string;
  MEDIA_CHANNELS: string;
}

// ── 契约常量 ──────────────────────────────────────────────────────────
const WINDOW_S = 300; // 时间窗 5 分钟，同时接受上一个窗口
const TS_SKEW_S = 300; // X-MG-Ts 与服务器时间差上限
const MAX_BODY = 2 * 1024 * 1024; // 2 MB → 413
const QUEUE_MAX = 5000; // 未 ack 队列上限（每渠道）→ 429
const IP_PER_MIN = 60; // 每 IP 每分钟 push 上限（每渠道）→ 429
const NONCE_TTL = 600; // nonce 保留 600s
const UNACKED_KEEP_DAYS = 30;
const ACKED_KEEP_DAYS = 7;

const ROLE_ENDPOINTS: Record<string, string[]> = {
  script: ['push'],
  crm: ['pull', 'ack'],
};

// /media/<channel>/<win>/<action>
const PATH_RE = /^\/media\/([a-z][a-z0-9_-]{0,31})\/([0-9a-f]{16})\/(push|pull|ack)\/?$/;

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

/** 渠道白名单，来自 env；每次请求解析（配置变更无需重新部署代码语义） */
function channelsOf(env: Env): Set<string> {
  return new Set(
    (env.MEDIA_CHANNELS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/** 公钥结构：{ "<channel>": { "script": jwk, "crm": jwk } } */
type PubkeyMap = Record<string, Record<string, JsonWebKey>>;

/**
 * 验签：ES256，**只收 64 字节 r||s**（不收 DER）。
 * WebCrypto 的 ECDSA 签名格式原生就是 r||s，两端零转换。
 */
async function verifySignature(
  pubkeys: Record<string, JsonWebKey> | undefined,
  role: string,
  sigB64: string,
  message: Uint8Array,
): Promise<boolean> {
  const jwk = pubkeys?.[role];
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
  console.log(JSON.stringify({ svc: 'tc-web-media', ...entry }));
}

// ── 主入口 ────────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ① 网关头（弱方案）：比验签更早，不查 D1，外部直连一律 404
    if (!env.MEDIA_GATEWAY_SECRET || request.headers.get('X-MG-Gateway') !== env.MEDIA_GATEWAY_SECRET) {
      return deny();
    }

    // OPTIONS 等其它方法：本版不做 CORS，一律 404
    const m = PATH_RE.exec(url.pathname);
    if (!m) return deny();
    const [, channel, win, action] = m;

    // ② 渠道白名单：不合规直接拒绝（不提示是渠道非法还是路径非法）
    if (!channelsOf(env).has(channel)) return deny();

    if (request.method !== (action === 'pull' ? 'GET' : 'POST')) return deny();

    // ③ 路径窗口：只认当前与上一个
    const now = Math.floor(Date.now() / 1000);
    const [cur, prev] = await Promise.all([windowId(now), windowId(now - WINDOW_S)]);
    if (win !== cur && win !== prev) return deny();

    // ④ 头与时间戳
    const h = request.headers;
    const tsRaw = h.get('X-MG-Ts') || '';
    const nonce = h.get('X-MG-Nonce') || '';
    const dev = h.get('X-MG-Dev') || '';
    const role = h.get('X-MG-Role') || '';
    const sig = h.get('X-MG-Sig') || '';
    if (!tsRaw || !dev || !sig || !role) return deny();
    const ts = Date.parse(tsRaw);
    if (!Number.isFinite(ts) || Math.abs(now - Math.floor(ts / 1000)) > TS_SKEW_S) return deny();

    // ⑤ 角色与端点匹配
    if (!(ROLE_ENDPOINTS[role] || []).includes(action)) return deny();
    if (action !== 'pull' && !nonce) return deny();

    // ⑥ body：必须按**收到的原始字节**算哈希（绝不 JSON.parse 后重序列化）
    let bodyBytes = new Uint8Array(0);
    if (action !== 'pull') {
      const declared = Number(h.get('content-length') || 0);
      if (declared > MAX_BODY) return tooLarge();
      const raw = await request.arrayBuffer();
      if (raw.byteLength > MAX_BODY) return tooLarge();
      bodyBytes = new Uint8Array(raw);
    }

    // ⑦ nonce 未用过（先查后写：先验签通过再落库，避免未认证请求灌表）
    if (action !== 'pull') {
      const seen = await env.DB.prepare('SELECT 1 AS x FROM media_nonce WHERE dev = ? AND nonce = ?')
        .bind(dev, nonce)
        .first<{ x: number }>();
      if (seen) return deny();
    }

    // ⑧ 验签（签名原文：METHOD\nPATH\nTS\nNONCE\nDEV\nsha256hex(body)）
    const canonical = [
      request.method.toUpperCase(),
      url.pathname,
      tsRaw,
      nonce,
      dev,
      await sha256Hex(bodyBytes),
    ].join('\n');
    let pubkeyMap: PubkeyMap;
    try {
      pubkeyMap = JSON.parse(env.MEDIA_PUBKEYS || '{}') as PubkeyMap;
    } catch {
      log({ ev: 'pubkeys_parse_error' });
      return deny();
    }
    // 渠道与角色公钥必须匹配：reddit 的钥签 /media/x/... → 找不到 → 拒
    if (!(await verifySignature(pubkeyMap[channel], role, sig, new TextEncoder().encode(canonical)))) {
      return deny();
    }

    // 通过验签 → 落 nonce（并发重放：UNIQUE 冲突 → changes=0 → 404）
    if (action !== 'pull') {
      const ins = await env.DB
        .prepare('INSERT INTO media_nonce (dev, nonce, expires_at) VALUES (?, ?, ?) ON CONFLICT(dev, nonce) DO NOTHING')
        .bind(dev, nonce, now + NONCE_TTL)
        .run();
      if ((ins.meta?.changes ?? 0) === 0) return deny();
      // 惰性清理过期 nonce（成本极低，顺带做）
      await env.DB.prepare('DELETE FROM media_nonce WHERE expires_at < ?').bind(now).run();
    }

    if (action === 'push') return handlePush(env, channel, request, bodyBytes, dev, role, now);
    if (action === 'pull') return handlePull(env, channel, url);
    return handleAck(env, channel, bodyBytes, now);
  },

  /** 每日清理：未 ack 30 天 / 已 ack 7 天物理删 / 过期 nonce / 限流桶（全渠道） */
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const day = 86400;
    const stmts = [
      env.DB.prepare('DELETE FROM media_envelope WHERE acked_at IS NOT NULL AND acked_at < ?').bind(now - ACKED_KEEP_DAYS * day),
      env.DB.prepare('DELETE FROM media_envelope WHERE acked_at IS NULL AND received_at < ?').bind(now - UNACKED_KEEP_DAYS * day),
      env.DB.prepare('DELETE FROM media_nonce WHERE expires_at < ?').bind(now),
      env.DB.prepare('DELETE FROM media_rate'),
    ];
    const res = await env.DB.batch(stmts);
    log({ ev: 'cleanup', deleted: res.map((r) => r.meta?.changes ?? 0) });
  },
};

// ── push ──────────────────────────────────────────────────────────────
async function handlePush(
  env: Env,
  channel: string,
  request: Request,
  bodyBytes: Uint8Array,
  dev: string,
  role: string,
  now: number,
): Promise<Response> {
  // 队列深度（按渠道）
  const depth = await env.DB.prepare('SELECT COUNT(*) AS c FROM media_envelope WHERE channel = ? AND acked_at IS NULL')
    .bind(channel)
    .first<{ c: number }>();
  if ((depth?.c ?? 0) >= QUEUE_MAX) {
    log({ ev: 'push', channel, status: 429, reason: 'queue_full' });
    return tooMany();
  }

  // 每 IP 每分钟（IP 由转发层注入；拿不到时退回按 dev 计数，dev 在签名内不可伪造）
  const ip = request.headers.get('X-MG-Client-IP') || `dev:${dev}`;
  const bucket = `${channel}:${ip}:${Math.floor(now / 60)}`;
  // 注意：D1 的 `INSERT ... RETURNING` 走 .all() 拿不到行（results 为空），
  // 所以先 upsert 再单独 SELECT 读计数 —— 两步都廉价，别图省事。
  await env.DB
    .prepare('INSERT INTO media_rate (k, n) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET n = n + 1')
    .bind(bucket)
    .run();
  const rate = await env.DB.prepare('SELECT n FROM media_rate WHERE k = ?').bind(bucket).first<{ n: number }>();
  if ((rate?.n ?? 0) > IP_PER_MIN) {
    log({ ev: 'push', channel, status: 429, reason: 'rate' });
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
    log({ ev: 'push', channel, status: 404, reason: 'no_capture_id' });
    return deny();
  }

  // 先查幂等：重复提交直接返回原 rev，**不消耗 rev 号**
  // （否则每次重推都在序列里留一个空洞，也会白白占用一次写）
  const existed = await env.DB
    .prepare('SELECT rev FROM media_envelope WHERE channel = ? AND capture_id = ?')
    .bind(channel, captureId)
    .first<{ rev: number }>();
  if (existed) {
    log({ ev: 'push', channel, status: 200, dup: true, rev: existed.rev, capture_id: captureId });
    return json(200, { ok: true, dup: true, rev: existed.rev, channel });
  }

  const ins = await insertWithRev(env, channel, captureId, now, dev, role, text).catch((err) => {
    // 非约束类错误（字段超限、写入限流…）不要归因成 rev 竞争，直接失败
    log({ ev: 'push', channel, status: 500, reason: 'insert_failed', err: String(err).slice(0, 200) });
    return 'error' as const;
  });
  if (ins === 'error') return json(500, { ok: false });
  if (ins === 'exhausted') {
    log({ ev: 'push', channel, status: 429, reason: 'rev_contention' });
    return tooMany();
  }
  if (typeof ins === 'number') {
    log({ ev: 'push', channel, status: 200, rev: ins, capture_id: captureId, device: dev });
    return json(200, { ok: true, rev: ins, channel });
  }

  // 已存在 → dup，rev 不变
  log({ ev: 'push', channel, status: 200, dup: true, rev: ins.rev, capture_id: captureId });
  return json(200, { ok: true, dup: true, rev: ins.rev, channel });
}

/**
 * 渠道内 rev 分配器：media_meta 是唯一真相。
 *
 * 不能从 media_envelope 的 MAX(rev) 取号 —— 已 ack 的行 7 天后被物理删，
 * MAX 会退化到更小值，下一条 push 就复用历史 rev；而消费端水位已经更高，
 * 那些新数据永远拉不到（日志里 pull 一切正常，只是没数据）。
 *
 * upsert 与读取放进同一个 batch（D1 batch = 单事务），保证拿号原子，
 * 并发请求不会拿到同一个号。
 */
async function nextRev(env: Env, channel: string): Promise<number> {
  const [, sel] = await env.DB.batch([
    env.DB
      .prepare('INSERT INTO media_meta (channel, last_rev) VALUES (?, 1) ON CONFLICT(channel) DO UPDATE SET last_rev = last_rev + 1')
      .bind(channel),
    env.DB.prepare('SELECT last_rev FROM media_meta WHERE channel = ?').bind(channel),
  ]);
  const row = (sel?.results as Array<{ last_rev: number }> | undefined)?.[0];
  return row?.last_rev ?? 1;
}

/**
 * 写入一条信封，返回分配到的 rev；capture_id 已存在则返回 { rev }；
 * 多次撞 (channel, rev) 主键则返回 'exhausted'。
 */
async function insertWithRev(
  env: Env,
  channel: string,
  captureId: string,
  now: number,
  dev: string,
  role: string,
  body: string,
): Promise<number | { rev: number } | 'exhausted'> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const rev = await nextRev(env, channel);
    try {
      const ins = await env.DB
        .prepare('INSERT INTO media_envelope (rev, channel, capture_id, received_at, device, role, body) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(rev, channel, captureId, now, dev, role, body)
        .run();
      if ((ins.meta?.changes ?? 0) === 1) return rev;
    } catch (err) {
      // 重复提交：capture_id 已存在（比 (channel,rev) 竞争更常见）
      const dup = await env.DB
        .prepare('SELECT rev FROM media_envelope WHERE channel = ? AND capture_id = ?')
        .bind(channel, captureId)
        .first<{ rev: number }>();
      if (dup) return { rev: dup.rev };
      // 只有约束冲突才重试；其余错误抛回上层（不把真错误吞成 429）
      const msg = String((err as Error)?.message ?? err);
      if (!/SQLITE_CONSTRAINT|UNIQUE constraint/i.test(msg)) throw err;
    }
  }
  return 'exhausted';
}

// ── pull ──────────────────────────────────────────────────────────────
async function handlePull(env: Env, channel: string, url: URL): Promise<Response> {
  const sinceRaw = Number(url.searchParams.get('since_rev') ?? '0');
  const limitRaw = Number(url.searchParams.get('limit') ?? '50');
  const since = Number.isFinite(sinceRaw) && sinceRaw > 0 ? Math.floor(sinceRaw) : 0;
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 50, 1), 200);

  const rows = await env.DB
    .prepare('SELECT rev, body FROM media_envelope WHERE channel = ? AND acked_at IS NULL AND rev > ? ORDER BY rev ASC LIMIT ?')
    .bind(channel, since, limit)
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
      .prepare('SELECT 1 AS x FROM media_envelope WHERE channel = ? AND acked_at IS NULL AND rev > ? LIMIT 1')
      .bind(channel, lastRev)
      .first<{ x: number }>();
    hasMore = !!more;
  }

  // 顶层 rev = **游标**（本页最后一条的 rev；空页原样返回 since_rev）。
  // CRM 用它当水位落盘，所以不能是全局 MAX(rev) —— 那会让 CRM 一次跳到底，
  // 没返回的条目永远拉不到（数据卡死）。
  const rev = rows.results?.length ? lastRev : since;
  log({ ev: 'pull', channel, status: 200, items: items.length, has_more: hasMore, rev });
  return json(200, { ok: true, channel, rev, items, has_more: hasMore });
}

// ── ack ───────────────────────────────────────────────────────────────
async function handleAck(env: Env, channel: string, bodyBytes: Uint8Array, now: number): Promise<Response> {
  let ids: string[] = [];
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bodyBytes)) as { capture_ids?: unknown };
    if (Array.isArray(parsed?.capture_ids)) {
      ids = parsed.capture_ids.filter((x): x is string => typeof x === 'string' && x.length > 0);
    }
  } catch {
    return deny();
  }
  if (!ids.length) return json(200, { ok: true, channel, acked: 0, rev: await currentRev(env, channel) });

  const capped = ids.slice(0, 500); // 单次上限，防超大 IN 列表
  const placeholders = capped.map(() => '?').join(',');
  const upd = await env.DB
    .prepare(`UPDATE media_envelope SET acked_at = ? WHERE channel = ? AND acked_at IS NULL AND capture_id IN (${placeholders})`)
    .bind(now, channel, ...capped)
    .run();

  const acked = upd.meta?.changes ?? 0;
  const rev = await currentRev(env, channel);
  log({ ev: 'ack', channel, status: 200, acked, rev });
  return json(200, { ok: true, channel, acked, rev });
}

async function currentRev(env: Env, channel: string): Promise<number> {
  const row = await env.DB.prepare('SELECT COALESCE(MAX(rev), 0) AS r FROM media_envelope WHERE channel = ?')
    .bind(channel)
    .first<{ r: number }>();
  return row?.r ?? 0;
}
