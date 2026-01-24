-- Add slug column to businesses table for vanity URLs
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS slug text;

-- Add unique constraint to ensure no duplicate URLs
ALTER TABLE businesses 
ADD CONSTRAINT businesses_slug_key UNIQUE (slug);

-- Create an index for faster lookup by slug
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);
