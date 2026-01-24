-- DANGER: This deletes ALL data from your app's tables
-- It does NOT delete the Auth Users (logins/passwords)
-- It resets the IDs to start fresh.

TRUNCATE TABLE customers, pets, jobs, services, businesses, profiles RESTART IDENTITY CASCADE;

-- If you want to delete the actual Login Accounts too (so you can sign up with same email again):
-- DELETE FROM auth.users;
-- (But Supabase might block this from SQL Editor for safety without special perms)
