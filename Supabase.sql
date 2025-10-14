-- Enable required extensions
create extension if not exists "pgcrypto" with schema public;

-- Notes table keeps processed WalkNotes entries
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  style_id text not null,
  style_name text not null,
  style_description text not null,
  title text not null,
  content text not null,
  transcript text not null,
  transcript_summary text,
  audio_path text not null,
  audio_mime_type text,
  audio_duration_seconds numeric,
  status text not null default 'completed' check (status in ('pending', 'processing', 'completed', 'failed')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_id_created_at_idx on public.notes (user_id, created_at desc);

alter table public.notes enable row level security;

create
or replace function public.handle_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create trigger notes_updated_at
before update on public.notes
for each row
execute procedure public.handle_updated_at();

-- Policies
create policy "Service role full access"
on public.notes
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- Storage policies for the manually created bucket (see info.md)
create policy "Service role full access"
on storage.objects
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
