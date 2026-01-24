-- Allow public (anon) users to insert into leads table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy for inserting leads (anyone can insert)
CREATE POLICY "Public can insert leads"
ON leads FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy for viewing leads (only authenticated users can view)
CREATE POLICY "Authenticated users can view leads"
ON leads FOR SELECT
TO authenticated
USING (true);
