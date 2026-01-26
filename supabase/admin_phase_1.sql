-- # Phase 1: Admin System Schema
-- Adds support for Ticketing, System Logs, Performance Metrics, and Global Configs.

-- 1. TICKETING SYSTEM
create table if not exists public.support_tickets (
  id uuid default uuid_generate_v4() primary key,
  business_id uuid references public.businesses(id) not null,
  user_id uuid references auth.users(id) not null,
  subject text not null,
  description text not null,
  status text default 'new', -- 'new', 'active', 'resolved', 'closed'
  priority text default 'medium', -- 'low', 'medium', 'high', 'urgent'
  category text, -- 'bug', 'feature_request', 'billing', 'question'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Internal notes on tickets (hidden from users)
create table if not exists public.ticket_comments (
  id uuid default uuid_generate_v4() primary key,
  ticket_id uuid references public.support_tickets(id) on delete cascade not null,
  author_id uuid references auth.users(id) not null,
  content text not null,
  is_internal boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. SYSTEM LOGS (Bug Tracking)
create table if not exists public.system_logs (
  id uuid default uuid_generate_v4() primary key,
  level text default 'error', -- 'error', 'warning', 'info'
  message text not null,
  stack_trace text,
  metadata jsonb,
  user_id uuid references auth.users(id),
  business_id uuid references public.businesses(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. AUDIT & IMPERSONATION LOGS
create table if not exists public.admin_audit_logs (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid references auth.users(id) not null,
  target_business_id uuid references public.businesses(id),
  action text not null, -- 'LOGIN_AS_START', 'LOGIN_AS_END', etc.
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. DAILY AGGREGATED METRICS (For Valuation/KPIs)
create table if not exists public.daily_metrics (
  id uuid default uuid_generate_v4() primary key,
  business_id uuid references public.businesses(id) not null,
  date date default current_date not null,
  jobs_created integer default 0,
  leads_received integer default 0,
  active_session_minutes integer default 0,
  sync_errors_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(business_id, date)
);

-- 5. SYSTEM CONFIGURATIONS (Kill Switches)
create table if not exists public.system_configs (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed defaults
insert into public.system_configs (key, value, description)
values 
  ('maintenance_mode', 'false'::jsonb, 'Enable to block all non-admin access'),
  ('signups_enabled', 'true'::jsonb, 'Enable/disable new user signups'),
  ('payments_enabled', 'true'::jsonb, 'Enable/disable checkout flows'),
  ('ai_enabled', 'true'::jsonb, 'Enable/disable K9 Assistant features')
on conflict (key) do nothing;

-- 6. ROW LEVEL SECURITY (RLS)
alter table public.support_tickets enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.system_logs enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.daily_metrics enable row level security;
alter table public.system_configs enable row level security;

-- Super Admin Policy (Applies to all new tables)
-- We'll assume role-based logic is already in the profiles table.

create policy "Admins can manage support tickets" on support_tickets
  for all using (exists (select 1 from profiles where id = auth.uid() and role in ('super_admin', 'support_admin')));

create policy "Admins can manage ticket comments" on ticket_comments
  for all using (exists (select 1 from profiles where id = auth.uid() and role in ('super_admin', 'support_admin')));

create policy "Admins can view system logs" on system_logs
  for select using (exists (select 1 from profiles where id = auth.uid() and role in ('super_admin', 'support_admin')));

create policy "Admins can view audit logs" on admin_audit_logs
  for select using (exists (select 1 from profiles where id = auth.uid() and role = 'super_admin'));

create policy "Admins can view metrics" on daily_metrics
  for select using (exists (select 1 from profiles where id = auth.uid() and role in ('super_admin', 'support_admin')));

create policy "Admins can manage configs" on system_configs
  for all using (exists (select 1 from profiles where id = auth.uid() and role = 'super_admin'));

-- Public/User Policies
create policy "Users can view own tickets" on support_tickets for select using (user_id = auth.uid());
create policy "Users can create tickets" on support_tickets for insert with check (user_id = auth.uid());
create policy "Users can view own non-internal comments" on ticket_comments for select using (
  exists (select 1 from support_tickets where id = ticket_id and user_id = auth.uid())
  and is_internal = false
);
