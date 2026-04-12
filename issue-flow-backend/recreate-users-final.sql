DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL UNIQUE,
    username TEXT,
    first_name TEXT,
    tech_stack TEXT DEFAULT '[]',
    notification_enabled INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_chat_id ON users(chat_id);