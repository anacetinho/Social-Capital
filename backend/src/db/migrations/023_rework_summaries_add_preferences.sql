-- Migration 023: Rework Summaries and Add User Preferences
-- This migration:
-- 1. Drops old summary columns from people table
-- 2. Adds new summary_a and summary_b columns
-- 3. Creates user_preferences table for UI toggles

-- ============================================
-- 1. Rework people table summaries
-- ============================================

-- Drop old summary columns (clean slate approach)
ALTER TABLE people DROP COLUMN IF EXISTS summary;
ALTER TABLE people DROP COLUMN IF EXISTS summary_generated_at;

-- Add new summary columns
ALTER TABLE people ADD COLUMN IF NOT EXISTS summary_a TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS summary_a_generated_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE people ADD COLUMN IF NOT EXISTS summary_b TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS summary_b_generated_at TIMESTAMP WITHOUT TIME ZONE;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_people_summary_a_generated_at ON people(summary_a_generated_at);
CREATE INDEX IF NOT EXISTS idx_people_summary_b_generated_at ON people(summary_b_generated_at);

-- ============================================
-- 2. Create user_preferences table
-- ============================================

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  show_summary_a BOOLEAN NOT NULL DEFAULT TRUE,
  show_summary_b BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================
-- 3. Enable Row-Level Security (RLS) for user_preferences
-- ============================================

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS user_preferences_isolation_policy ON user_preferences;

-- Create RLS policy: users can only access their own preferences
CREATE POLICY user_preferences_isolation_policy ON user_preferences
  USING (user_id = current_setting('app.current_user_id')::uuid);

-- ============================================
-- 4. Create trigger to auto-update updated_at
-- ============================================

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS user_preferences_updated_at_trigger ON user_preferences;

-- Create trigger
CREATE TRIGGER user_preferences_updated_at_trigger
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- ============================================
-- Migration Complete
-- ============================================
-- Summary:
-- - Old summaries removed (clean slate)
-- - New summary_a and summary_b columns added to people
-- - user_preferences table created with RLS
-- - Users must regenerate all summaries
