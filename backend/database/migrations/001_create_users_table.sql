-- ============================================================
--  Nyria — users table
--  Run this SQL in your Supabase project:
--  Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- 1. Create the users table linked to Supabase Auth
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  name        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Auto-update updated_at on every row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute procedure public.set_updated_at();

-- 3. Row Level Security — users can only read/update their own row
alter table public.users enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id);

-- 4. Service role can insert (used by the backend signup handler)
drop policy if exists "service_role_insert" on public.users;
create policy "service_role_insert"
  on public.users for insert
  with check (true);   -- backend uses service_role key which bypasses RLS anyway

-- 5. Helpful index
create index if not exists users_email_idx on public.users(email);

-- Done!
select 'users table ready' as status;
