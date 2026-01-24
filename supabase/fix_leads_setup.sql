-- 1. Ensure 'notes' column exists
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes text;

-- 2. Enable RLS on leads (if not already)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policy to avoid conflict
DROP POLICY IF EXISTS "Public leads insert" ON leads;

-- 4. Create policy allowing anyone to INSERT rows
CREATE POLICY "Public leads insert"
ON leads
FOR INSERT
TO public
WITH CHECK (true);

-- 5. Grant access to public role (just in case)
GRANT INSERT ON leads TO public;
GRANT USAGE, SELECT ON SEQUENCE leads_id_seq TO public;
