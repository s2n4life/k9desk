-- Create LEADS table for the Online Intake Form
create table public.leads (
  id uuid default uuid_generate_v4() primary key,
  business_id uuid references public.businesses(id) not null,
  status text default 'new', -- 'new', 'contacted', 'scheduled', 'dead'
  owner_name text not null,
  owner_phone text not null,
  owner_email text,
  service_area_zip text,
  pet_details jsonb, -- Array of { name, breed, weight, age }
  preferred_dates jsonb, -- Array of strings
  waiver_signed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table leads enable row level security;

-- Policies for LEADS
-- 1. Public can INSERT (for the booking form)
create policy "Public can insert leads" on leads
  for insert with check (true);

-- 2. Business Owners can VIEW their own leads
create policy "Users can view business leads" on leads
  for select using (
    business_id in (select business_id from profiles where id = auth.uid())
  );

-- 3. Business Owners can UPDATE their own leads
create policy "Users can update business leads" on leads
  for update using (
    business_id in (select business_id from profiles where id = auth.uid())
  );
