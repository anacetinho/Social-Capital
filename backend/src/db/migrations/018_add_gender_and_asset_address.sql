-- Migration 018: Add gender to people and address to assets
-- Created: 2025-10-21

-- Add gender to people table (MANDATORY, only male or female)
ALTER TABLE people
ADD COLUMN gender VARCHAR(10) NOT NULL DEFAULT 'male' CHECK (gender IN ('male', 'female'));

COMMENT ON COLUMN people.gender IS 'Gender/sex of the person (male or female) - required field';

-- Add address to assets table (for real estate/property)
ALTER TABLE assets
ADD COLUMN address TEXT;

COMMENT ON COLUMN assets.address IS 'Physical address for property/real estate assets';

-- Note: The DEFAULT 'male' is only for this migration to handle existing records
-- New records created through the API will require explicit gender selection
