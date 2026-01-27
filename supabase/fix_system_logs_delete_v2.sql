-- Fix RLS for system_logs to allow deletion by admins
-- and universal insertion for error reporting

-- 1. Drop existing policies to ensure a clean state
DROP POLICY IF EXISTS "Admins can view system logs" ON public.system_logs;
DROP POLICY IF EXISTS "Authenticated users can insert system logs" ON public.system_logs;
DROP POLICY IF EXISTS "Anyone can insert system logs" ON public.system_logs;
DROP POLICY IF EXISTS "Admins can delete system logs" ON public.system_logs;

-- 2. Allow Admins to View and Delete
CREATE POLICY "Admins can manage system logs" ON public.system_logs
  FOR ALL -- Includes SELECT and DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'support_admin')
  ));

-- 3. Allow Anyone to Insert (so we catch bugs from all users/visitors)
CREATE POLICY "Anyone can insert system logs" ON public.system_logs
  FOR INSERT 
  WITH CHECK (true);

-- 4. Grant explicit permissions to the public and authenticated roles
GRANT ALL ON public.system_logs TO authenticated;
GRANT INSERT ON public.system_logs TO anon;
