-- ============================================
-- SUPER ADMIN PROMOTION SCRIPT
-- ============================================
-- This script will promote your account to super_admin
-- 
-- INSTRUCTIONS:
-- 1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
-- 2. Copy and paste this ENTIRE script
-- 3. Click "RUN" in the bottom right
-- 4. Refresh your K9Desk app and try accessing /admin again
-- ============================================

-- Step 1: Find your user ID from auth.users
-- (This will show you all registered users and their emails)
SELECT 
    id as user_id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- Step 2: Update the profile with super_admin role
-- IMPORTANT: Replace 'YOUR_USER_ID_HERE' with the ID from Step 1
-- IMPORTANT: Replace 'YOUR_EMAIL_HERE' with your actual email from Step 1

UPDATE public.profiles
SET 
    role = 'super_admin',
    email = 'YOUR_EMAIL_HERE'  -- Make sure this matches your auth.users email
WHERE id = 'YOUR_USER_ID_HERE';  -- Use the UUID from auth.users

-- Step 3: Verify the promotion worked
SELECT 
    id,
    email,
    full_name,
    role,
    created_at
FROM public.profiles
WHERE role = 'super_admin';

-- You should see your account with role = 'super_admin'
-- If you see a result, you're all set! 🎉
