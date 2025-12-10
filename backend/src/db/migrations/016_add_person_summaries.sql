-- Migration: Add AI-generated summary fields to people table
-- Enables comprehensive person summaries for enhanced LLM analysis

ALTER TABLE people
ADD COLUMN summary TEXT,
ADD COLUMN summary_generated_at TIMESTAMP WITHOUT TIME ZONE;

-- Index for efficient querying of summary generation status
CREATE INDEX idx_people_summary_generated_at ON people(summary_generated_at);

-- Comment for documentation
COMMENT ON COLUMN people.summary IS 'AI-generated comprehensive summary aggregating all person data (biographical, professional, relationships, events, favors, assets)';
COMMENT ON COLUMN people.summary_generated_at IS 'Timestamp when summary was last generated or updated';
