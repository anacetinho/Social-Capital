-- Migration: Add estimated_value and time_commitment to favors table
-- Created: 2025-10-15

ALTER TABLE favors
ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS time_commitment VARCHAR(100);

COMMENT ON COLUMN favors.estimated_value IS 'Estimated monetary value of the favor';
COMMENT ON COLUMN favors.time_commitment IS 'Time commitment for the favor (e.g., "2 hours", "1 day")';
