-- Migrate LLM configuration from old columns to unified AI columns
-- This migration syncs data between local_llm_base_url/local_llm_model and ai_api_url/ai_model
-- Migration 022: 2025-11-04

-- Sync data: copy from new columns to old columns if old are empty
UPDATE users
SET
  local_llm_base_url = ai_api_url,
  local_llm_model = ai_model
WHERE
  ai_api_url IS NOT NULL
  AND ai_api_url != ''
  AND (local_llm_base_url IS NULL OR local_llm_base_url = '');

-- Sync data: copy from old columns to new columns if new are empty
UPDATE users
SET
  ai_provider = 'local',
  ai_api_url = local_llm_base_url,
  ai_model = local_llm_model
WHERE
  local_llm_base_url IS NOT NULL
  AND local_llm_base_url != ''
  AND (ai_api_url IS NULL OR ai_api_url = '');

-- Add comment for documentation
COMMENT ON COLUMN users.ai_provider IS 'Unified AI provider for both Concordia and AI Assistant (mock, openai, local)';
COMMENT ON COLUMN users.ai_api_url IS 'Unified API URL for both Concordia and AI Assistant';
COMMENT ON COLUMN users.ai_model IS 'Unified AI model name for both Concordia and AI Assistant';
