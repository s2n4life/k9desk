-- Fix RLS for leads table to allow public booking form submissions
-- This script ensures anonymous users can insert leads via the booking form

-- 1. Drop all existing policies on leads table to start fresh
DROP POLICY IF EXISTS "Public leads insert" ON leads;
DROP POLICY IF EXISTS "Public can insert leads" ON leads;
DROP POLICY IF EXISTS "Allow public insert" ON leads;
DROP POLICY IF EXISTS "Any insert" ON leads;
DROP POLICY IF EXISTS "Users can view business leads" ON leads;
DROP POLICY IF EXISTS "Users can update business leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can view leads" ON leads;
DROP POLICY IF EXISTS "Owner view leads" ON leads;

-- 2. Ensure RLS is enabled
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 3. Create INSERT policy for anonymous users (booking form)
CREATE POLICY "Public can insert leads"
ON leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 4. Create SELECT policy for authenticated users to view their business leads
CREATE POLICY "Users can view business leads"
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

-- 5. Create UPDATE policy for authenticated users to update their business leads
CREATE POLICY "Users can update business leads"
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

-- 6. Create DELETE policy for authenticated users to delete their business leads
CREATE POLICY "Users can delete business leads"
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

-- 7. Grant necessary table permissions
GRANT INSERT ON leads TO anon;
GRANT SELECT, UPDATE, DELETE ON leads TO authenticated;
