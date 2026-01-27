-- COMPREHENSIVE FIX FOR LEADS TABLE RLS
-- This script will diagnose and fix the RLS issue preventing public booking form submissions

-- Step 1: Check current policies (for debugging)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'leads';

-- Step 2: Drop ALL existing policies on leads table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'leads') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON leads';
    END LOOP;
END $$;

-- Step 3: Ensure RLS is enabled
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Step 4: Create a permissive INSERT policy for ALL roles (including anon)
CREATE POLICY "allow_public_insert_leads"
ON leads
FOR INSERT
TO public
WITH CHECK (true);

-- Step 5: Create SELECT policy for authenticated users only
CREATE POLICY "allow_authenticated_select_leads"
ON leads
FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Step 6: Create UPDATE policy for authenticated users
CREATE POLICY "allow_authenticated_update_leads"
ON leads
FOR UPDATE
TO authenticated
USING (
  business_id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Step 7: Create DELETE policy for authenticated users
CREATE POLICY "allow_authenticated_delete_leads"
ON leads
FOR DELETE
TO authenticated
USING (
  business_id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Step 8: Grant table-level permissions explicitly
GRANT INSERT ON leads TO anon;
GRANT INSERT ON leads TO authenticated;
GRANT SELECT, UPDATE, DELETE ON leads TO authenticated;

-- Step 9: Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'leads'
ORDER BY cmd, policyname;
