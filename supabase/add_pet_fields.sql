-- Add missing 'size' and 'age' columns to the 'pets' table
ALTER TABLE pets ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS age TEXT;
