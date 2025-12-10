-- Add AI Assistant settings to users table
-- These settings control the AI assistant feature per user

ALTER TABLE users
ADD COLUMN ai_assistant_enabled BOOLEAN DEFAULT false,
ADD COLUMN local_llm_base_url VARCHAR(255) DEFAULT 'http://localhost:1234',
ADD COLUMN local_llm_model VARCHAR(255) DEFAULT 'llama-2-7b-chat',
ADD COLUMN ai_max_results INTEGER DEFAULT 100;

-- Add index for quick lookup of AI-enabled users
CREATE INDEX idx_users_ai_enabled ON users(ai_assistant_enabled) WHERE ai_assistant_enabled = true;

COMMENT ON COLUMN users.ai_assistant_enabled IS 'Whether the AI assistant is enabled for this user';
COMMENT ON COLUMN users.local_llm_base_url IS 'Base URL for local LLM server (e.g., LM Studio, Ollama)';
COMMENT ON COLUMN users.local_llm_model IS 'Name of the LLM model to use';
COMMENT ON COLUMN users.ai_max_results IS 'Maximum number of items to return in function responses';
