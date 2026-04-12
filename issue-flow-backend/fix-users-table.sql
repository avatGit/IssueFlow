-- Ajoute les colonnes manquantes SANS DEFAULT complexe
-- SQLite accepte seulement les constantes littérales dans ALTER TABLE
ALTER TABLE users
ADD COLUMN username TEXT;
ALTER TABLE users
ADD COLUMN first_name TEXT;
ALTER TABLE users
ADD COLUMN notification_enabled INTEGER DEFAULT 1;
ALTER TABLE users
ADD COLUMN updated_at TEXT;
-- Index optionnel
CREATE INDEX IF NOT EXISTS idx_users_chat_id ON users(chat_id);