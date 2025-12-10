-- Migration 025: Add key_person_id to users table
-- Adds reference to the user's primary persona for "asking as" default

-- Add key_person_id column (user's primary persona/identity in the network)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS key_person_id UUID REFERENCES people(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_key_person_id ON users(key_person_id);

-- Add comment for documentation
COMMENT ON COLUMN users.key_person_id IS 'User''s primary persona in the network - default for "asking as" feature in chat';
