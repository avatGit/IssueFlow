-- Migration: Ajouter les colonnes manquantes à la table users

-- Ajouter chat_id si n'existe pas
ALTER TABLE users ADD COLUMN chat_id TEXT;

-- Ajouter username si n'existe pas
ALTER TABLE users ADD COLUMN username TEXT;

-- Ajouter first_name si n'existe pas
ALTER TABLE users ADD COLUMN first_name TEXT;

-- Ajouter notification_enabled si n'existe pas
ALTER TABLE users ADD COLUMN notification_enabled BOOLEAN DEFAULT 1;

-- Ajouter updated_at si n'existe pas
ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Créer l'index sur chat_id
CREATE INDEX IF NOT EXISTS idx_users_chat_id ON users(chat_id);