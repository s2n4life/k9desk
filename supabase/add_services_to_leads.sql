-- Add service_ids column to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS service_ids jsonb DEFAULT '[]'::jsonb;

-- Comment for clarity
COMMENT ON COLUMN leads.service_ids IS 'List of service IDs selected by the customer during booking';
