alter table public.tulio_media
  add column if not exists presskit_studio_enabled boolean not null default false;