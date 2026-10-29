PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TEXT NOT NULL
);
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('common', 'game')),
  game_id TEXT REFERENCES games(id),
  dependencies TEXT NOT NULL DEFAULT '[]',
  exclude_paths TEXT NOT NULL DEFAULT '[]',
  required_command_scripts TEXT NOT NULL DEFAULT '[]',
  inspection_file TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE skill_versions (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  version TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  file_id TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  manifest TEXT NOT NULL,
  UNIQUE (skill_id, version)
);
CREATE TABLE skill_uploads (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  user_id TEXT NOT NULL REFERENCES users(id)
);
CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL
);
CREATE TABLE cookie_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL
);
