-- Add Recurrence Rules for Rolling Recurring Appointments
-- This migration creates the recurrence_rules table and adds recurrence support to jobs

-- 1. Create recurrence_rules table
create table public.recurrence_rules (
  id uuid default uuid_generate_v4() primary key,
  business_id uuid references public.businesses(id) not null,
  customer_id uuid references public.clients(id) not null,
  frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly', 'every_6_weeks', 'every_2_months')),
  interval_days integer not null,
  status text default 'active' check (status in ('active', 'paused', 'canceled')),
  next_run_date timestamp with time zone,
  last_generated_job_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add recurrence_rule_id to jobs table
alter table public.jobs add column recurrence_rule_id uuid references public.recurrence_rules(id);

-- 3. Enable RLS on recurrence_rules
alter table recurrence_rules enable row level security;

-- 4. RLS Policies for recurrence_rules
-- Users can view recurrence rules for their business
create policy "Users can view business recurrence rules" on recurrence_rules
  for select using (
    business_id in (select business_id from profiles where id = auth.uid())
  );

-- Users can insert recurrence rules for their business
create policy "Users can insert business recurrence rules" on recurrence_rules
  for insert with check (
    business_id in (select business_id from profiles where id = auth.uid())
  );

-- Users can update recurrence rules for their business
create policy "Users can update business recurrence rules" on recurrence_rules
  for update using (
    business_id in (select business_id from profiles where id = auth.uid())
  );

-- Users can delete recurrence rules for their business
create policy "Users can delete business recurrence rules" on recurrence_rules
  for delete using (
    business_id in (select business_id from profiles where id = auth.uid())
  );

-- 5. Create index for performance
create index idx_recurrence_rules_business_id on recurrence_rules(business_id);
create index idx_recurrence_rules_status on recurrence_rules(status);
create index idx_jobs_recurrence_rule_id on jobs(recurrence_rule_id);
