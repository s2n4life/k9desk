-- 1. Enable RLS (just in case)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 2. Drop ANY conflicting policies to start fresh
DROP POLICY IF EXISTS "Public leads insert" ON leads;
DROP POLICY IF EXISTS "Public can insert leads" ON leads;
DROP POLICY IF EXISTS "Allow public insert" ON leads;
DROP POLICY IF EXISTS "Any insert" ON leads;

-- 3. Create the ONE TRUE POLICY for public inserts
CREATE POLICY "Public leads insert"
ON leads
FOR INSERT
TO public
WITH CHECK (true);

-- 4. Grant necessary permissions to the public role (often overlooked)
GRANT INSERT ON leads TO public;
GRANT UPDATE ON leads_id_seq TO public; -- Just in case a sequence is used, though not likely for UUIDs, it doesn't hurt.
