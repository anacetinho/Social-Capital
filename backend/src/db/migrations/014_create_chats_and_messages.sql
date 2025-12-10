-- Create chats and messages tables for AI Assistant
-- Chats represent conversation threads between user and AI
-- Messages are individual exchanges within a chat

CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_created_at ON chats(created_at DESC);
CREATE INDEX idx_chats_user_created ON chats(user_id, created_at DESC);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tool_calls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at ASC);

-- Add RLS policies for chats
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY chats_user_isolation ON chats
  USING (user_id = current_setting('app.current_user_id')::uuid);

-- Add RLS policies for messages (inherit from chats)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_user_isolation ON messages
  USING (
    chat_id IN (
      SELECT id FROM chats WHERE user_id = current_setting('app.current_user_id')::uuid
    )
  );

-- Add updated_at trigger for chats
CREATE OR REPLACE FUNCTION update_chats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_chats_updated_at();

COMMENT ON TABLE chats IS 'AI assistant conversation threads';
COMMENT ON TABLE messages IS 'Individual messages within AI assistant chats';
COMMENT ON COLUMN messages.role IS 'user or assistant';
COMMENT ON COLUMN messages.tool_calls IS 'Array of function calls made by the AI (JSON)';
