-- COMPREHENSIVE ADMIN BYPASS FOR RLS (FIXED TABLE NAMES)
-- Allows super_admin and support_admin roles to see and manage data across all businesses.
-- Corrected table names: customers, pets, jobs, leads, businesses.

--------------------------------------------------------------------------------
-- 1. LEADS TABLE
--------------------------------------------------------------------------------

-- VIEW: Allow admins to see ALL leads
DROP POLICY IF EXISTS "admin_view_all_leads" ON leads;
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
DROP POLICY IF EXISTS "admin_update_all_leads" ON leads;
DROP POLICY IF EXISTS "Users can update business leads" ON leads;

CREATE POLICY "admin_update_all_leads" ON leads
FOR UPDATE TO authenticated
USING (
  business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'support_admin')
);

-- DELETE: Allow admins to delete any lead
DROP POLICY IF EXISTS "admin_delete_all_leads" ON leads;
DROP POLICY IF EXISTS "Users can delete business leads" ON leads;

CREATE POLICY "admin_delete_all_leads" ON leads
FOR DELETE TO authenticated
USING (
  business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'support_admin')
);

--------------------------------------------------------------------------------
-- 2. CUSTOMERS TABLE
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "admin_view_all_customers" ON customers;
DROP POLICY IF EXISTS "Users can view business customers" ON customers;
CREATE POLICY "admin_view_all_customers" ON customers
FOR SELECT TO authenticated
USING (
  business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'support_admin')
);

--------------------------------------------------------------------------------
-- 3. PETS TABLE
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "admin_view_all_pets" ON pets;
DROP POLICY IF EXISTS "Users can view business pets" ON pets;
CREATE POLICY "admin_view_all_pets" ON pets
FOR SELECT TO authenticated
USING (
  business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'support_admin')
);

--------------------------------------------------------------------------------
-- 4. JOBS TABLE
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "admin_view_all_jobs" ON jobs;
DROP POLICY IF EXISTS "Users can view business jobs" ON jobs;
CREATE POLICY "admin_view_all_jobs" ON jobs
FOR SELECT TO authenticated
USING (
  business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'support_admin')
);

--------------------------------------------------------------------------------
-- 5. BUSINESSES TABLE
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "admin_view_all_businesses" ON businesses;
DROP POLICY IF EXISTS "Users can view own business" ON businesses;
CREATE POLICY "admin_view_all_businesses" ON businesses
FOR SELECT TO authenticated
USING (
  id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'support_admin')
);
