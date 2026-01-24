-- Add the owner_email column to the businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- (Optional) Add a comment
COMMENT ON COLUMN businesses.owner_email IS 'Email address of the business owner for easy reference';
