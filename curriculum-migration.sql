-- Curriculum metadata migration and public read policy.
-- Run in Supabase SQL Editor after reviewing any existing policies.

alter table if exists public.curriculum
    add column if not exists semester integer;

alter table if exists public.curriculum
    drop constraint if exists curriculum_semester_range;

alter table if exists public.curriculum
    add constraint curriculum_semester_range
    check (semester is null or semester between 1 and 6);

alter table if exists public.curriculum enable row level security;

drop policy if exists "Public can read curriculum" on public.curriculum;
create policy "Public can read curriculum"
    on public.curriculum
    for select
    to anon, authenticated
    using (true);

revoke insert, update, delete on table public.curriculum from anon, authenticated;
grant select on table public.curriculum to anon, authenticated;

-- Do not run guessed backfills. After verifying each title manually, use statements like:
-- update public.curriculum set semester = 1 where id = '<verified-id>';
