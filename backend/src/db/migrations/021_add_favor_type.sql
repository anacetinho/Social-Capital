-- Add favor_type column to favors table
-- Types: personal, professional, other

ALTER TABLE favors
ADD COLUMN IF NOT EXISTS favor_type VARCHAR(50) CHECK (favor_type IN ('personal', 'professional', 'other')) DEFAULT 'other';

-- Create index for favor_type
CREATE INDEX IF NOT EXISTS idx_favors_favor_type ON favors(favor_type);
