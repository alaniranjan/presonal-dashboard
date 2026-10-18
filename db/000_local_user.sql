-- Single-user local mode: no sign-in. Every row belongs to one fixed practice user.
-- Provides the small part of Supabase's `auth` schema that 001_init.sql relies on.
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select '00000000-0000-0000-0000-000000000001'::uuid
$$;

do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
