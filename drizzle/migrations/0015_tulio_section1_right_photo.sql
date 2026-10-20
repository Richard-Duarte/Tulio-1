-- Right photo of section 1. The left photo stays on section1_image_url.
alter table public.tulio_home
  add column if not exists section1_right_image_url text;

update public.tulio_home
set
  section1_right_image_url = '/brand/tulio-booth.jpg',
  updated_at = now()
where singleton_key = 'main'
  and section1_right_image_url is null;
