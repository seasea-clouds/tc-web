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

-- 渠道 rev 分配器：唯一真相。
-- 不能从 media_envelope 的 MAX(rev) 取号 —— 已 ack 的行 7 天后会被物理删，
-- MAX 会退化到更小值，下一条 push 就会复用历史 rev（消费端水位更高 → 静默丢数据）。
CREATE TABLE IF NOT EXISTS media_meta (
  channel  TEXT PRIMARY KEY,
  last_rev INTEGER NOT NULL
);

-- 已有数据时用现有最大值播种（新库为空则无行）
INSERT INTO media_meta (channel, last_rev)
SELECT channel, MAX(rev) FROM media_envelope GROUP BY channel
ON CONFLICT(channel) DO NOTHING;

-- 限流桶：k = "<channel>:<ip>:<minute>"
CREATE TABLE IF NOT EXISTS media_rate (
  k TEXT    PRIMARY KEY,
  n INTEGER NOT NULL
);
