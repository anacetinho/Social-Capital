-- Migration 024: Add persona fields to chats table
-- Adds asking_as_person_id and talking_to_person_id for person-aware chat features

-- Add asking_as_person_id column (which person's perspective is the user querying from)
ALTER TABLE chats
ADD COLUMN IF NOT EXISTS asking_as_person_id UUID REFERENCES people(id) ON DELETE SET NULL;

-- Add talking_to_person_id column (which person is being simulated in roleplay mode)
ALTER TABLE chats
ADD COLUMN IF NOT EXISTS talking_to_person_id UUID REFERENCES people(id) ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chats_asking_as_person_id ON chats(asking_as_person_id);
CREATE INDEX IF NOT EXISTS idx_chats_talking_to_person_id ON chats(talking_to_person_id);

-- Add comments for documentation
COMMENT ON COLUMN chats.asking_as_person_id IS 'Person whose perspective is being used for network queries (inherits from key_person by default)';
COMMENT ON COLUMN chats.talking_to_person_id IS 'Person being simulated/roleplayed by the AI assistant (NULL = generic assistant)';
