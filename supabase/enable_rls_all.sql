-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- 1. Policies for 'businesses' table (The "Root" table)
-- Users can insert their own business
CREATE POLICY "Users can create their own business" ON businesses
FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can only see/update their own business
CREATE POLICY "Users can view own business" ON businesses
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own business" ON businesses
FOR UPDATE USING (auth.uid() = id);

-- 2. Policies for 'customers'
CREATE POLICY "Users can all CRUD customers" ON customers
FOR ALL USING (auth.uid() = business_id);

-- 3. Policies for 'pets'
CREATE POLICY "Users can all CRUD pets" ON pets
FOR ALL USING (auth.uid() = business_id);

-- 4. Policies for 'services'
CREATE POLICY "Users can all CRUD services" ON services
FOR ALL USING (auth.uid() = business_id);

-- 5. Policies for 'jobs'
CREATE POLICY "Users can all CRUD jobs" ON jobs
FOR ALL USING (auth.uid() = business_id);
