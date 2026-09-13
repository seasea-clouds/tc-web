-- 邮件审核队列（2026-09-13）
-- 背景：/api/report/send-email 无鉴权、收件人由请求体决定，直接发送等于把域名当开放邮件发送源。
-- 改为：免费自查入队 → 管理后台人工审核（approved）→ 由 portal 定时函数投递（sent / failed）；
--       付费/内部（Creem webhook 带 x-stc-internal）仍即时发送，不入队。
--
-- 应用方式（生产 D1 trade-web-portal-db）：
--   set -a && . ./.env && set +a
--   curl -sS -X POST -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
--     --data "$(python3 -c 'import json,sys;print(json.dumps({"sql":open("apps/admin/migrations/002-email-review.sql").read()}))')" \
--     "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/d1/database/$D1_DATABASE_ID/query"

CREATE TABLE IF NOT EXISTS email_queue (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  to_email TEXT NOT NULL,
  module TEXT,
  locale TEXT DEFAULT 'en',
  source TEXT NOT NULL DEFAULT 'free_check',   -- free_check | paid
  status TEXT NOT NULL DEFAULT 'pending',      -- pending | approved | sent | rejected | failed
  attempts INTEGER DEFAULT 0,
  error TEXT,
  ip TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reviewed_by TEXT,
  sent_at TEXT,
  FOREIGN KEY (report_id) REFERENCES reports(id)
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_report ON email_queue(report_id);
CREATE INDEX IF NOT EXISTS idx_reports_guest_token ON reports(guest_token);
