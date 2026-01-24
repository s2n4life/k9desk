-- 1. Create Services Table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.services (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  price numeric,
  duration_minutes integer,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Public Read Access (for Booking Page)
CREATE POLICY "Public can view business services" ON public.services
  FOR SELECT USING (true); 
  -- Ideally we filter by business_id in the query, but allowing public read of services is generally fine for a booking app.
  -- Refining it to:
  -- USING (business_id IS NOT NULL);

-- Owner Full Access
CREATE POLICY "Users can view own services" ON public.services
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert own services" ON public.services
  FOR INSERT WITH CHECK (
    business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own services" ON public.services
  FOR UPDATE USING (
    business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete own services" ON public.services
  FOR DELETE USING (
    business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

-- 4. Ensure Leads Table has service_ids (idempotent)
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS service_ids jsonb DEFAULT '[]'::jsonb;
