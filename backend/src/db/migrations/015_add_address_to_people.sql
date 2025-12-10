-- Add address and linkedin_url columns to people table

ALTER TABLE people
ADD COLUMN address TEXT,
ADD COLUMN linkedin_url VARCHAR(500);
