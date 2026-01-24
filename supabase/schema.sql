-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Users)
-- Links to Supabase Auth.Users
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  business_id uuid, -- Link to which business they belong to
  role text default 'owner', -- 'owner', 'employee', or 'super_admin'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. BUSINESSES (Tenants)
-- Represents the grooming company
create table public.businesses (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  subscription_status text default 'trialing', -- 'active', 'past_due', 'canceled', 'trialing'
  stripe_customer_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. CLIENTS (Customers of the Groomer)
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  business_id uuid references public.businesses(id) not null,
  full_name text not null,
  phone_number text,
  email text,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. DOGS (Pets)
create table public.dogs (
  id uuid default uuid_generate_v4() primary key,
  business_id uuid references public.businesses(id) not null,
  client_id uuid references public.clients(id) not null,
  name text not null,
  breed text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. JOBS (Appointments)
create table public.jobs (
  id uuid default uuid_generate_v4() primary key,
  business_id uuid references public.businesses(id) not null,
  client_id uuid references public.clients(id) not null,
  dog_id uuid references public.dogs(id) not null,
  date_scheduled timestamp with time zone,
  status text default 'scheduled', -- 'scheduled', 'completed', 'canceled'
  price decimal,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ROW LEVEL SECURITY (RLS) --
-- This is the magic that prevents Business A from seeing Business B's data

alter table profiles enable row level security;
alter table businesses enable row level security;
alter table clients enable row level security;
alter table dogs enable row level security;
alter table jobs enable row level security;

-- Policies for PROFILES
-- Users can see their own profile
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

-- Policies for BUSINESSES
-- Users can view their own business
create policy "Users can view own business" on businesses
  for select using (
    id in (select business_id from profiles where id = auth.uid())
  );

-- Policies for CLIENTS
-- Users can only see clients that belong to their business
create policy "Users can view business clients" on clients
  for select using (
    business_id in (select business_id from profiles where id = auth.uid())
  );
  
create policy "Users can insert business clients" on clients
  for insert with check (
    business_id in (select business_id from profiles where id = auth.uid())
  );

create policy "Users can update business clients" on clients
  for update using (
    business_id in (select business_id from profiles where id = auth.uid())
  );

-- (Repeat similar policies for DOGS and JOBS)
create policy "Users can view business dogs" on dogs
  for select using (
    business_id in (select business_id from profiles where id = auth.uid())
  );
  
create policy "Users can insert business dogs" on dogs
  for insert with check (
    business_id in (select business_id from profiles where id = auth.uid())
  );

create policy "Users can update business dogs" on dogs
  for update using (
    business_id in (select business_id from profiles where id = auth.uid())
  );

create policy "Users can view business jobs" on jobs
  for select using (
    business_id in (select business_id from profiles where id = auth.uid())
  );
  
create policy "Users can insert business jobs" on jobs
  for insert with check (
    business_id in (select business_id from profiles where id = auth.uid())
  );

create policy "Users can update business jobs" on jobs
  for update using (
    business_id in (select business_id from profiles where id = auth.uid())
  );
