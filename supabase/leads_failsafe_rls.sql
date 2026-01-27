-- FAILSAFE RLS FOR LEADS INSERTION
-- This ensures that anonymous users can submit the booking form even if the server-side service key fails to load.
-- SECURITY: This ONLY allows INSERT. SELECT/UPDATE/DELETE are still restricted by business_id and admin roles.

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 1. Drop any existing insert policies to start fresh
DROP POLICY IF EXISTS "Public leads insert" ON leads;
DROP POLICY IF EXISTS "Public can insert leads" ON leads;
DROP POLICY IF EXISTS "allow_public_insert_leads" ON leads;
DROP POLICY IF EXISTS "allow_public_insert_leads_v2" ON leads;
DROP POLICY IF EXISTS "Anyone can insert leads" ON leads;

-- 2. Create the explicit public insert policy
CREATE POLICY "allow_public_insert_leads_final"
ON leads
FOR INSERT
TO public
WITH CHECK (true);

-- 3. Verify selectivity (Admins can still see them)
-- This was already set in the previous admin_rls script but repeating for leads specifically
DROP POLICY IF EXISTS "admin_view_all_leads" ON leads;
CREATE POLICY "admin_view_all_leads" ON leads
FOR SELECT TO authenticated
USING (
  business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'support_admin')
);

RAISE NOTICE 'Leads RLS failsafe applied: Public INSERT is now explicitly allowed.';
