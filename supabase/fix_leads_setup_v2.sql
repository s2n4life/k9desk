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

-- 5. Grant access to public role (Crucial for public booking forms)
GRANT INSERT ON leads TO public;

-- NOTE: We removed the sequence grant because your table uses UUIDs, which don't need it.
