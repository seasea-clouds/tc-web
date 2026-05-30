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
`;

export const D1_BINDING = "DB";
