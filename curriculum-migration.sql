-- Public read policy for curriculum documents.
-- Run in Supabase SQL Editor after reviewing any existing policies.

alter table if exists public.curriculum enable row level security;

drop policy if exists "Public can read curriculum" on public.curriculum;
create policy "Public can read curriculum"
    on public.curriculum
    for select
    to anon, authenticated
    using (true);

revoke insert, update, delete on table public.curriculum from anon, authenticated;
grant select on table public.curriculum to anon, authenticated;
