-- Reddit 采集链路 · 哑存储（契约：docs/reddit-plan-v2/01-CONTRACT.md §2.7/§6，施工单 §3）
-- Worker 只存信封原样：不合并、不派生、不改正文

-- 信封表：rev 单调自增（AUTOINCREMENT 保证不回退、不复用），capture_id 唯一 → push 幂等
CREATE TABLE IF NOT EXISTS rd_envelope (
  rev         INTEGER PRIMARY KEY AUTOINCREMENT,
  capture_id  TEXT    NOT NULL UNIQUE,
  received_at INTEGER NOT NULL,           -- unix 秒
  acked_at    INTEGER,                    -- NULL = 未 ack
  device      TEXT,
  role        TEXT,
  body        TEXT    NOT NULL            -- 信封原始字符串（不做任何改写）
);

-- pull 只扫未 ack，按 rev 升序
CREATE INDEX IF NOT EXISTS rd_envelope_unacked ON rd_envelope (rev) WHERE acked_at IS NULL;
-- 保留期清理
CREATE INDEX IF NOT EXISTS rd_envelope_acked ON rd_envelope (acked_at) WHERE acked_at IS NOT NULL;

-- nonce 防重放：主键冲突 = 重放（600s TTL，惰性清理 + 每日 cron 兜底）
CREATE TABLE IF NOT EXISTS rd_nonce (
  dev        TEXT    NOT NULL,
  nonce      TEXT    NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (dev, nonce)
);
CREATE INDEX IF NOT EXISTS rd_nonce_exp ON rd_nonce (expires_at);

-- 限流桶：k = "<ip>:<minute>"，n = 该分钟内 push 次数
CREATE TABLE IF NOT EXISTS rd_rate (
  k TEXT    PRIMARY KEY,
  n INTEGER NOT NULL
);
