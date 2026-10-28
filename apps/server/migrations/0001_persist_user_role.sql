-- 仅用于已按旧 schema.sql 初始化的数据库；新数据库直接使用当前 schema.sql。
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));
