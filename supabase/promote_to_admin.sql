-- # Manual Super Admin Promotion
-- Replace 'YOUR_EMAIL_HERE' with the email you use to log into K9Desk.

UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'YOUR_EMAIL_HERE';

-- Verification: After running the above, you should see your row with role 'super_admin'
SELECT email, role FROM public.profiles WHERE role = 'super_admin';
