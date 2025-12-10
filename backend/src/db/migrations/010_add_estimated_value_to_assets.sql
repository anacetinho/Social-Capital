-- Add estimated_value column to assets table
ALTER TABLE assets ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(15, 2);
