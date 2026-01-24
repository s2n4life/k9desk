-- 1. Drop existing SELECT policies to avoid duplication
DROP POLICY IF EXISTS "Owner view leads" ON leads;
DROP POLICY IF EXISTS "Enable read access for owners" ON leads;

-- 2. Create the SELECT policy
-- "Allow a user to see a lead IF the lead belongs to a business owned by the user"
CREATE POLICY "Owner view leads"
ON leads
FOR SELECT
TO authenticated
USING (
    business_id IN (
        SELECT id 
        FROM businesses 
        WHERE owner_id = auth.uid()
    )
);

-- 3. Grant SELECT permission
GRANT SELECT ON leads TO authenticated;
