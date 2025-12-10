-- Add Concordia AI configuration columns to users table
-- These columns are required for the Concordia simulation feature
-- Migration 021: 2025-11-04

ALTER TABLE users
ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(50) DEFAULT 'mock',
ADD COLUMN IF NOT EXISTS ai_model VARCHAR(255) DEFAULT '',
ADD COLUMN IF NOT EXISTS ai_api_url VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS api_key VARCHAR(500) DEFAULT '';

-- Add comments for documentation
COMMENT ON COLUMN users.ai_provider IS 'AI provider for Concordia simulations (mock, openai, local, etc.)';
COMMENT ON COLUMN users.ai_model IS 'AI model name to use for Concordia simulations';
COMMENT ON COLUMN users.ai_api_url IS 'Custom API URL for AI provider (for self-hosted models)';
COMMENT ON COLUMN users.api_key IS 'API key for AI provider (encrypted at application layer)';
