-- 媒体网关 · 哑存储（多渠道）
-- rev 按渠道独立递增（每渠道从 1 开始）；channel 无默认值，非法渠道在路由层就已 404

CREATE TABLE IF NOT EXISTS media_envelope (
  rev         INTEGER NOT NULL,
  channel     TEXT    NOT NULL,
  capture_id  TEXT    NOT NULL,
  received_at INTEGER NOT NULL,                    -- unix 秒
  acked_at    INTEGER,                             -- NULL = 未 ack
  device      TEXT,
  role        TEXT,
  body        TEXT    NOT NULL,                    -- 信封原始字符串（不改写）
  PRIMARY KEY (channel, rev),
  UNIQUE (channel, capture_id)
);

-- pull 只扫未 ack，按 rev 升序
CREATE INDEX IF NOT EXISTS media_envelope_pending
  ON media_envelope (channel, rev) WHERE acked_at IS NULL;
-- 保留期清理
CREATE INDEX IF NOT EXISTS media_envelope_acked
  ON media_envelope (channel, acked_at) WHERE acked_at IS NOT NULL;

-- nonce 防重放：主键冲突 = 重放
CREATE TABLE IF NOT EXISTS media_nonce (
  dev        TEXT    NOT NULL,
  nonce      TEXT    NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (dev, nonce)
);
CREATE INDEX IF NOT EXISTS media_nonce_exp ON media_nonce (expires_at);

-- 限流桶：k = "<channel>:<ip>:<minute>"
CREATE TABLE IF NOT EXISTS media_rate (
  k TEXT    PRIMARY KEY,
  n INTEGER NOT NULL
);
