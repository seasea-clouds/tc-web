-- Admin 管理后台数据库迁移
-- 2026-07-05

-- 管理员账号表
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 管理员会话表
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (admin_id) REFERENCES admin_users(id)
);

-- 管理员操作日志表
CREATE TABLE IF NOT EXISTS admin_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  admin_name TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  target_summary TEXT,
  detail TEXT,
  ip TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (admin_id) REFERENCES admin_users(id)
);

-- users 表新增 status 字段
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';

-- 插入初始管理员账号（密码: admin123）
-- 密码使用 HMAC-SHA256 加密，key="admin-password", data=password
INSERT OR IGNORE INTO admin_users (id, username, email, password_hash, name)
VALUES (
  'admin-001',
  'admin',
  'admin@sinotradecompliance.com',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'Administrator'
);
