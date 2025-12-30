-- Migration: Add ai_timeout column to users table
-- Allows users to configure LLM request timeout in seconds
-- Default: 200 seconds (previously hardcoded at 300 seconds/5 minutes)

ALTER TABLE users
ADD COLUMN ai_timeout INTEGER DEFAULT 200;

COMMENT ON COLUMN users.ai_timeout IS 'LLM request timeout in seconds (default: 200, min: 10, max: 600)';

-- Update existing users to have the default timeout
UPDATE users 
SET ai_timeout = 200 
WHERE ai_timeout IS NULL;
