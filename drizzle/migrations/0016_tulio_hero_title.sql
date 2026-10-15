-- Editable title above the home bio text (panel label: Trajetória).
alter table public.tulio_home
  add column if not exists hero_title text;

update public.tulio_home
set
  hero_title = 'Trajetória',
  updated_at = now()
where singleton_key = 'main'
  and (hero_title is null or btrim(hero_title) = '');
