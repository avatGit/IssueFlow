CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  tech_stack TEXT DEFAULT '[]',
  notification_enabled BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_id INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  summary_fr TEXT,
  difficulty_score INTEGER,
  tech_stack TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sent_to_users BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  issue_id INTEGER NOT NULL,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (issue_id) REFERENCES issues(id)
);

CREATE INDEX IF NOT EXISTS idx_users_chat_id ON users(chat_id);
CREATE INDEX IF NOT EXISTS idx_issues_tech_stack ON issues(tech_stack);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);