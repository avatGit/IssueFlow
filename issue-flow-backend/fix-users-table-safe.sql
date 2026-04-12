-- Ajoute chat_id (la plus critique) si elle n'existe pas
ALTER TABLE users
ADD COLUMN IF NOT EXISTS chat_id TEXT;
-- Ajoute les autres colonnes potentiellement manquantes
ALTER TABLE users
ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users
ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users
ADD COLUMN IF NOT EXISTS tech_stack TEXT DEFAULT '[]';
ALTER TABLE users
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT 1;
ALTER TABLE users
ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
-- Crée l'index (IF NOT EXISTS est toujours supporté pour les indexes)
CREATE INDEX IF NOT EXISTS idx_users_chat_id ON users(chat_id);