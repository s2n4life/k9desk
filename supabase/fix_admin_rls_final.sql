-- COMPREHENSIVE ADMIN BYPASS FOR RLS
-- Allows super_admin and support_admin roles to see and manage data across all businesses.
-- This is critical for impersonation and support functionality.

--------------------------------------------------------------------------------
-- 1. LEADS TABLE
--------------------------------------------------------------------------------

-- VIEW: Allow admins to see ALL leads
DROP POLICY IF EXISTS "allow_authenticated_select_leads" ON leads;
DROP POLICY IF EXISTS "Users can view business leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can view leads" ON leads;
DROP POLICY IF EXISTS "Owner view leads" ON leads;

CREATE POLICY "admin_view_all_leads" ON leads
FOR SELECT TO authenticated
USING (
  business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'support_admin')
);

-- UPDATE: Allow admins to update any lead
DROP POLICY IF EXISTS "allow_authenticated_update_leads" ON leads;
DROP POLICY IF EXISTS "Users can update business leads" ON leads;

CREATE POLICY "admin_update_all_leads" ON leads
FOR UPDATE TO authenticated
USING (
  business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'support_admin')
);

-- DELETE: Allow admins to delete any lead
DROP POLICY IF EXISTS "allow_authenticated_delete_leads" ON leads;
DROP POLICY IF EXISTS "Users can delete business leads" ON leads;

CREATE POLICY "admin_delete_all_leads" ON leads
FOR DELETE TO authenticated
USING (
  business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'support_admin')
);

--------------------------------------------------------------------------------
-- 2. CUSTOMERS (CLIENTS) TABLE
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view business clients" ON clients;
CREATE POLICY "admin_view_all_clients" ON clients
FOR SELECT TO authenticated
USING (
  business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'support_admin')
);

DROP POLICY IF EXISTS "Users can update business clients" ON clients;
CREATE POLICY "admin_update_all_clients" ON clients
FOR UPDATE TO authenticated
USING (
  business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'support_admin')
);

--------------------------------------------------------------------------------
-- 3. PETS (DOGS) TABLE
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view business dogs" ON dogs;
CREATE POLICY "admin_view_all_dogs" ON dogs
FOR SELECT TO authenticated
USING (
  business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'support_admin')
);

DROP POLICY IF EXISTS "Users can update business dogs" ON dogs;
CREATE POLICY "admin_update_all_dogs" ON dogs
FOR UPDATE TO authenticated
USING (
  business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'support_admin')
);

--------------------------------------------------------------------------------
-- 4. JOBS TABLE
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view business jobs" ON jobs;
CREATE POLICY "admin_view_all_jobs" ON jobs
FOR SELECT TO authenticated
USING (
  business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'support_admin')
);

DROP POLICY IF EXISTS "Users can update business jobs" ON jobs;
CREATE POLICY "admin_update_all_jobs" ON jobs
FOR UPDATE TO authenticated
USING (
  business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'support_admin')
);

--------------------------------------------------------------------------------
-- 5. BUSINESSES TABLE
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own business" ON businesses;
CREATE POLICY "admin_view_all_businesses" ON businesses
FOR SELECT TO authenticated
USING (
  id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'support_admin')
);

-- Note: We already have public insert for leads, so we don't need to change that.
-- This ensures admins have a "God View" when impersonating or managing the platform.
