/** D1 数据库 Schema */

export const SCHEMA_SQL = `
-- 报告表
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  product_name TEXT,
  hs_code TEXT,
  origin_country TEXT,
  input_data TEXT,
  result_data TEXT,
  user_email TEXT,
  guest_token TEXT,
  payment_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  pdf_path TEXT,
  locale TEXT DEFAULT 'en',
  created_at TEXT DEFAULT (datetime('now'))
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT,
  locale TEXT DEFAULT 'en',
  created_at TEXT DEFAULT (datetime('now'))
);

-- 订阅表
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  provider_subscription_id TEXT,
  current_period_start TEXT,
  current_period_end TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- sessions table (httpOnly Cookie)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- page_views table (custom analytics tracking)
CREATE TABLE IF NOT EXISTS page_views (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  project TEXT DEFAULT 'site',
  referrer TEXT,
  country TEXT,
  user_agent TEXT,
  locale TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- payments table (Creem payment records)
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  report_id TEXT,
  user_email TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending',
  provider TEXT DEFAULT 'creem',
  provider_payment_id TEXT,
  provider_subscription_id TEXT,
  refunded_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (report_id) REFERENCES reports(id)
);

-- indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_project ON page_views(project);
CREATE INDEX IF NOT EXISTS idx_page_views_country ON page_views(country);
`;

export const D1_BINDING = "DB";
