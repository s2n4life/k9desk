-- 1. Enable RLS on the profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create a policy that allows users to view/edit ONLY their own rows
-- The "USING" clause checks if the row's ID matches the logged-in user's ID
CREATE POLICY "Users can only access their own profile"
ON profiles
FOR ALL
USING (auth.uid() = id);

-- 3. (Optional but recommended) Grant access to authenticated users
-- This ensures 'anon' users (not logged in) cannot access the table at all
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;
