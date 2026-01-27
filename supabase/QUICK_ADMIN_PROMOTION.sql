-- ============================================
-- STEP 1: Find your user info
-- ============================================
-- Run this first to see your user ID and email from auth.users
SELECT 
    id,
    email,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- STEP 2: Promote by USER ID (not email)
-- ============================================
-- Copy the 'id' from Step 1 results and paste it below
-- Replace the UUID below with YOUR user ID

UPDATE public.profiles
SET 
    role = 'super_admin',
    email = (SELECT email FROM auth.users WHERE id = profiles.id)
WHERE id = '2e64c118-acfd-4f65-8255-101635869a7f';  -- ← Replace this with your actual user ID from Step 1

-- ============================================
-- STEP 3: Verify it worked
-- ============================================
SELECT 
    id,
    email,
    role,
    created_at
FROM public.profiles
WHERE role = 'super_admin';

-- You should see 1 row with your email and role = 'super_admin'
