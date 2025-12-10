-- Migration 026: Add geocoding columns to people and assets tables
-- Adds latitude, longitude, geocoding timestamp, and error tracking for map feature

-- Add geocoding columns to people table
DO $$
BEGIN
    -- Add latitude column (decimal with 8 decimal places for ~1 meter precision)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'people' AND column_name = 'latitude'
    ) THEN
        ALTER TABLE people ADD COLUMN latitude DECIMAL(10, 8);
    END IF;

    -- Add longitude column (decimal with 8 decimal places for ~1 meter precision)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'people' AND column_name = 'longitude'
    ) THEN
        ALTER TABLE people ADD COLUMN longitude DECIMAL(11, 8);
    END IF;

    -- Add timestamp for when geocoding was performed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'people' AND column_name = 'geocoded_at'
    ) THEN
        ALTER TABLE people ADD COLUMN geocoded_at TIMESTAMP;
    END IF;

    -- Add column to store geocoding errors or status messages
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'people' AND column_name = 'geocode_error'
    ) THEN
        ALTER TABLE people ADD COLUMN geocode_error TEXT;
    END IF;
END $$;

-- Add geocoding columns to assets table
DO $$
BEGIN
    -- Add latitude column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assets' AND column_name = 'latitude'
    ) THEN
        ALTER TABLE assets ADD COLUMN latitude DECIMAL(10, 8);
    END IF;

    -- Add longitude column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assets' AND column_name = 'longitude'
    ) THEN
        ALTER TABLE assets ADD COLUMN longitude DECIMAL(11, 8);
    END IF;

    -- Add timestamp for when geocoding was performed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assets' AND column_name = 'geocoded_at'
    ) THEN
        ALTER TABLE assets ADD COLUMN geocoded_at TIMESTAMP;
    END IF;

    -- Add column to store geocoding errors or status messages
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assets' AND column_name = 'geocode_error'
    ) THEN
        ALTER TABLE assets ADD COLUMN geocode_error TEXT;
    END IF;
END $$;

-- Create index on latitude/longitude for faster geospatial queries
CREATE INDEX IF NOT EXISTS idx_people_location ON people(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comment to document the purpose
COMMENT ON COLUMN people.latitude IS 'Geocoded latitude for mapping person address';
COMMENT ON COLUMN people.longitude IS 'Geocoded longitude for mapping person address';
COMMENT ON COLUMN people.geocoded_at IS 'Timestamp when address was last geocoded';
COMMENT ON COLUMN people.geocode_error IS 'Error message if geocoding failed';

COMMENT ON COLUMN assets.latitude IS 'Geocoded latitude for mapping asset/property location';
COMMENT ON COLUMN assets.longitude IS 'Geocoded longitude for mapping asset/property location';
COMMENT ON COLUMN assets.geocoded_at IS 'Timestamp when address was last geocoded';
COMMENT ON COLUMN assets.geocode_error IS 'Error message if geocoding failed';
