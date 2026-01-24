-- Add owner_address to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS owner_address text;

-- Allow public insert policy to cover this new column (already covers 'true' so implicit, but good to know)
