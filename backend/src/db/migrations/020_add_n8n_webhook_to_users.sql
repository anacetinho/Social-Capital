-- Migration: Add N8N webhook URL configuration to users table
-- This allows users to have custom N8N webhook endpoints for AI assistant
-- Date: 2025-10-22

-- Add n8n_webhook_url column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS n8n_webhook_url TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN users.n8n_webhook_url IS 'Custom N8N webhook URL for AI assistant. If NULL, uses global N8N_WEBHOOK_URL environment variable.';

-- Set default webhook URL for existing users with AI enabled
-- This uses the standard localhost n8n endpoint
UPDATE users
SET n8n_webhook_url = 'http://localhost:5678/webhook/socap1'
WHERE ai_assistant_enabled = TRUE
AND n8n_webhook_url IS NULL;

-- Note: No need to set for users with AI disabled as they won't use it
