-- Workouts & Meals — one-time Supabase setup
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run.

-- One row per signed-in user, holding the whole dashboard (program, logs,
-- meals, water, supplements, weigh-ins, profile) as JSON.
create table if not exists public.dashboard_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null,
  updated_at timestamptz not null default now()
);

-- Lock it down: the publishable key in index.html is public, so Row Level
-- Security is what keeps the data private. Each user can only touch their own row.
alter table public.dashboard_state enable row level security;

drop policy if exists "read own dashboard"   on public.dashboard_state;
drop policy if exists "insert own dashboard" on public.dashboard_state;
drop policy if exists "update own dashboard" on public.dashboard_state;
drop policy if exists "delete own dashboard" on public.dashboard_state;

create policy "read own dashboard" on public.dashboard_state
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "insert own dashboard" on public.dashboard_state
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "update own dashboard" on public.dashboard_state
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "delete own dashboard" on public.dashboard_state
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Signed-out visitors (the anon role) get nothing.
revoke all on public.dashboard_state from anon;
grant select, insert, update, delete on public.dashboard_state to authenticated;
