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

-- daily aggregated page stats (powered by CF GraphQL Analytics, 1 row per day)
CREATE TABLE IF NOT EXISTS daily_page_stats (
  date TEXT PRIMARY KEY,
  total_pv INTEGER DEFAULT 0,
  total_uv INTEGER DEFAULT 0,
  total_requests INTEGER DEFAULT 0,
  total_bytes INTEGER DEFAULT 0,
  cached_requests INTEGER DEFAULT 0,
  countries_count INTEGER DEFAULT 0,
  hourly_data TEXT,
  geo_data TEXT,
  browser_data TEXT DEFAULT '[]',
  status_code_data TEXT DEFAULT '[]',
  page_data TEXT,
  channel_data TEXT,
  project_data TEXT,
  os_data TEXT DEFAULT '[]',
  device_data TEXT DEFAULT '[]',
  source TEXT DEFAULT 'page_views',
  created_at TEXT DEFAULT (datetime('now'))
);

-- hourly aggregated page stats (CF httpRequests1hGroups cache)
CREATE TABLE IF NOT EXISTS hourly_page_stats (
  date TEXT NOT NULL,
  hour INTEGER NOT NULL,
  pv INTEGER DEFAULT 0,
  uv INTEGER DEFAULT 0,
  requests INTEGER DEFAULT 0,
  PRIMARY KEY (date, hour)
);

-- indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_project ON page_views(project);
CREATE INDEX IF NOT EXISTS idx_page_views_country ON page_views(country);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_page_stats(date);
CREATE INDEX IF NOT EXISTS idx_hourly_stats_date ON hourly_page_stats(date);
`;

export const D1_BINDING = "DB";
