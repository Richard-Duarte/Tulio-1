-- Tulio site copy and the photos the public site already shows.
alter table public.tulio_home
  add column if not exists hero_body text,
  add column if not exists hero_image_url text;

update public.tulio_home
set
  hero_body = 'Túlio atua conectado à cultura underground, construindo experiências através de seus sets. Suas apresentações são desenvolvidas de forma progressiva, explorando tensão, atmosfera, groove e dinâmica para criar uma conexão contínua com a pista. Cada set é construído como uma narrativa, em que seleção musical, sensibilidade e leitura de pista conduzem a experiência do início ao fim.

Sua identidade sonora tem o House como principal ponto de partida, mas se expande por diferentes vertentes e referências da música eletrônica. Essa amplitude faz parte de sua pesquisa musical e aparece de maneira fluida em seus sets, onde diferentes sonoridades, texturas e influências se encontram sem perder coerência. Mais do que se limitar a um gênero específico, sua seleção é guiada pela narrativa, pela energia e pelo momento da pista.

Ao longo de sua trajetória, apresentou-se em diferentes cenários da música eletrônica brasileira, incluindo a pista Sinkrö do Festival Universo Paralello e o D-Edge, em São Paulo, além de performances em Fernando de Noronha e Jericoacoara.',
  hero_image_url = '/brand/tulio-n26.jpg',
  updated_at = now()
where singleton_key = 'main'
  and hero_body is null;

create table if not exists public.tulio_media (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text not null,
  alt_text text not null default '',
  public_url text,
  poster_url text,
  storage_bucket text not null default '',
  storage_path text not null default '',
  party_id text,
  homepage_enabled boolean not null default false,
  visible boolean not null default true,
  presskit_enabled boolean not null default false,
  downloadable boolean not null default true,
  captured_at date,
  sort_order integer not null default 0,
  homepage_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tulio_media_public_url_key
  on public.tulio_media (public_url);

grant select on public.tulio_media to anon, authenticated;
grant insert, update, delete on public.tulio_media to authenticated;
grant all on public.tulio_media to service_role;

alter table public.tulio_media enable row level security;

drop policy if exists "Public reads tulio media" on public.tulio_media;
create policy "Public reads tulio media" on public.tulio_media
  for select to anon, authenticated
  using (visible);

drop policy if exists "Admins manage tulio media" on public.tulio_media;
create policy "Admins manage tulio media" on public.tulio_media
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

insert into public.tulio_media (
  kind, title, alt_text, public_url, poster_url, party_id,
  homepage_enabled, visible, presskit_enabled, downloadable,
  captured_at, sort_order, homepage_order
) values
('image', 'Tulio 01', 'Tulio — Tulio', '/photos/tulio-2026/dsc08524.webp', null, 'tulio-2026', true, true, true, true, '2026-07-19', 0, 0),
('image', 'Tulio 02', 'Tulio — Tulio', '/photos/tulio-2026/dsc08347.webp', null, 'tulio-2026', true, true, true, true, '2026-07-19', 1, 3),
('image', 'Tulio 03', 'Tulio — Tulio', '/photos/tulio-2026/dsc08368.webp', null, 'tulio-2026', true, true, true, true, '2026-07-19', 2, 6),
('image', 'Tulio 04', 'Tulio — Tulio', '/photos/tulio-2026/dsc08372.webp', null, 'tulio-2026', true, true, true, true, '2026-07-19', 3, 9),
('image', 'Tulio 05', 'Tulio — Tulio', '/photos/tulio-2026/dsc08375.webp', null, 'tulio-2026', true, true, true, true, '2026-07-19', 4, 12),
('image', 'Tulio 06', 'Tulio — Tulio', '/photos/tulio-2026/dsc08420.webp', null, 'tulio-2026', false, true, true, true, '2026-07-19', 5, 99),
('image', 'Tulio 07', 'Tulio — Tulio', '/photos/tulio-2026/dsc08431.webp', null, 'tulio-2026', false, true, true, true, '2026-07-19', 6, 99),
('image', 'Tulio 08', 'Tulio — Tulio', '/photos/tulio-2026/dsc08453.webp', null, 'tulio-2026', false, true, true, true, '2026-07-19', 7, 99),
('image', 'Tulio 09', 'Tulio — Tulio', '/photos/tulio-2026/dsc08482.webp', null, 'tulio-2026', false, true, true, true, '2026-07-19', 8, 99),
('image', 'Tulio 10', 'Tulio — Tulio', '/photos/tulio-2026/dsc08503.webp', null, 'tulio-2026', false, true, true, true, '2026-07-19', 9, 99),
('image', 'Tulio 11', 'Tulio — Tulio', '/photos/tulio-2026/dsc08530.webp', null, 'tulio-2026', false, true, true, true, '2026-07-19', 10, 99),
('image', 'n26 01', 'Tulio — n26', '/photos/n26/n26-142.webp', null, 'n26', true, true, true, true, '2022-07-06', 0, 1),
('image', 'n26 02', 'Tulio — n26', '/photos/n26/n26-138.webp', null, 'n26', true, true, true, true, '2022-07-06', 1, 4),
('image', 'n26 03', 'Tulio — n26', '/photos/n26/n26-139.webp', null, 'n26', true, true, true, true, '2022-07-06', 2, 7),
('image', 'n26 04', 'Tulio — n26', '/photos/n26/n26-140.webp', null, 'n26', true, true, true, true, '2022-07-06', 3, 10),
('image', 'n26 05', 'Tulio — n26', '/photos/n26/n26-141.webp', null, 'n26', true, true, true, true, '2022-07-06', 4, 13),
('image', 'n26 06', 'Tulio — n26', '/photos/n26/n26-160.webp', null, 'n26', false, true, true, true, '2022-07-06', 5, 99),
('image', 'n26 07', 'Tulio — n26', '/photos/n26/n26-273.webp', null, 'n26', false, true, true, true, '2022-07-06', 6, 99),
('image', 'n26 08', 'Tulio — n26', '/photos/n26/n26-274.webp', null, 'n26', false, true, true, true, '2022-07-06', 7, 99),
('image', 'Tulio Syncro 01', 'Tulio — Tulio Syncro', '/photos/syncro/fly03419.webp', null, 'syncro', true, true, true, true, '2024-01-05', 0, 2),
('image', 'Tulio Syncro 02', 'Tulio — Tulio Syncro', '/photos/syncro/fly03386.webp', null, 'syncro', true, true, true, true, '2024-01-05', 1, 5),
('image', 'Tulio Syncro 03', 'Tulio — Tulio Syncro', '/photos/syncro/fly03387.webp', null, 'syncro', true, true, true, true, '2024-01-05', 2, 8),
('image', 'Tulio Syncro 04', 'Tulio — Tulio Syncro', '/photos/syncro/fly03388.webp', null, 'syncro', true, true, true, true, '2024-01-05', 3, 11),
('image', 'Tulio Syncro 05', 'Tulio — Tulio Syncro', '/photos/syncro/fly03394.webp', null, 'syncro', false, true, true, true, '2024-01-05', 4, 99),
('image', 'Tulio Syncro 06', 'Tulio — Tulio Syncro', '/photos/syncro/fly03398.webp', null, 'syncro', false, true, true, true, '2024-01-05', 5, 99),
('image', 'Tulio Syncro 07', 'Tulio — Tulio Syncro', '/photos/syncro/fly03399.webp', null, 'syncro', false, true, true, true, '2024-01-05', 6, 99),
('image', 'Tulio Syncro 08', 'Tulio — Tulio Syncro', '/photos/syncro/fly03400.webp', null, 'syncro', false, true, true, true, '2024-01-05', 7, 99),
('image', 'Tulio Syncro 09', 'Tulio — Tulio Syncro', '/photos/syncro/fly03401.webp', null, 'syncro', false, true, true, true, '2024-01-05', 8, 99),
('image', 'Tulio Syncro 10', 'Tulio — Tulio Syncro', '/photos/syncro/fly03421.webp', null, 'syncro', false, true, true, true, '2024-01-05', 9, 99),
('image', 'Tulio Syncro 11', 'Tulio — Tulio Syncro', '/photos/syncro/fly03423.webp', null, 'syncro', false, true, true, true, '2024-01-05', 10, 99),
('image', 'Tulio Syncro 12', 'Tulio — Tulio Syncro', '/photos/syncro/fly03424.webp', null, 'syncro', false, true, true, true, '2024-01-05', 11, 99),
('image', 'Tulio Syncro 13', 'Tulio — Tulio Syncro', '/photos/syncro/fly03428.webp', null, 'syncro', false, true, true, true, '2024-01-05', 12, 99),
('image', 'Tulio Syncro 14', 'Tulio — Tulio Syncro', '/photos/syncro/fly03431.webp', null, 'syncro', false, true, true, true, '2024-01-05', 13, 99),
('image', 'Tulio Syncro 15', 'Tulio — Tulio Syncro', '/photos/syncro/fly03440.webp', null, 'syncro', false, true, true, true, '2024-01-05', 14, 99),
('image', 'Tulio Syncro 16', 'Tulio — Tulio Syncro', '/photos/syncro/fly03446.webp', null, 'syncro', false, true, true, true, '2024-01-05', 15, 99),
('image', 'Tulio Syncro 17', 'Tulio — Tulio Syncro', '/photos/syncro/fly03448.webp', null, 'syncro', false, true, true, true, '2024-01-05', 16, 99),
('image', 'Tulio Syncro 18', 'Tulio — Tulio Syncro', '/photos/syncro/fly03452.webp', null, 'syncro', false, true, true, true, '2024-01-05', 17, 99),
('image', 'Tulio Syncro 19', 'Tulio — Tulio Syncro', '/photos/syncro/fly03454.webp', null, 'syncro', false, true, true, true, '2024-01-05', 18, 99),
('image', 'Tulio Syncro 20', 'Tulio — Tulio Syncro', '/photos/syncro/fly03462.webp', null, 'syncro', false, true, true, true, '2024-01-05', 19, 99),
('image', 'Tulio Syncro 21', 'Tulio — Tulio Syncro', '/photos/syncro/fly03471.webp', null, 'syncro', false, true, true, true, '2024-01-05', 20, 99),
('image', 'Tulio Syncro 22', 'Tulio — Tulio Syncro', '/photos/syncro/fly03476.webp', null, 'syncro', false, true, true, true, '2024-01-05', 21, 99),
('image', 'Tulio Syncro 23', 'Tulio — Tulio Syncro', '/photos/syncro/fly03478.webp', null, 'syncro', false, true, true, true, '2024-01-05', 22, 99),
('image', 'Tulio Syncro 24', 'Tulio — Tulio Syncro', '/photos/syncro/fly03479.webp', null, 'syncro', false, true, true, true, '2024-01-05', 23, 99),
('image', 'Tulio Syncro 25', 'Tulio — Tulio Syncro', '/photos/syncro/fly03486.webp', null, 'syncro', false, true, true, true, '2024-01-05', 24, 99),
('image', 'Tulio Syncro 26', 'Tulio — Tulio Syncro', '/photos/syncro/fly03489.webp', null, 'syncro', false, true, true, true, '2024-01-05', 25, 99),
('image', 'Tulio Syncro 27', 'Tulio — Tulio Syncro', '/photos/syncro/fly03498.webp', null, 'syncro', false, true, true, true, '2024-01-05', 26, 99),
('image', 'Tulio Syncro 28', 'Tulio — Tulio Syncro', '/photos/syncro/fly03499.webp', null, 'syncro', false, true, true, true, '2024-01-05', 27, 99),
('image', 'Tulio Syncro 29', 'Tulio — Tulio Syncro', '/photos/syncro/fly03500.webp', null, 'syncro', false, true, true, true, '2024-01-05', 28, 99),
('image', 'Tulio Syncro 30', 'Tulio — Tulio Syncro', '/photos/syncro/fly03503.webp', null, 'syncro', false, true, true, true, '2024-01-05', 29, 99),
('image', 'Tulio Syncro 31', 'Tulio — Tulio Syncro', '/photos/syncro/fly03504.webp', null, 'syncro', false, true, true, true, '2024-01-05', 30, 99),
('image', 'Tulio Syncro 32', 'Tulio — Tulio Syncro', '/photos/syncro/fly03518.webp', null, 'syncro', false, true, true, true, '2024-01-05', 31, 99),
('image', 'Tulio Syncro 33', 'Tulio — Tulio Syncro', '/photos/syncro/fly03521.webp', null, 'syncro', false, true, true, true, '2024-01-05', 32, 99),
('image', 'Tulio Syncro 34', 'Tulio — Tulio Syncro', '/photos/syncro/fly03525.webp', null, 'syncro', false, true, true, true, '2024-01-05', 33, 99),
('image', 'Tulio Syncro 35', 'Tulio — Tulio Syncro', '/photos/syncro/fly03526.webp', null, 'syncro', false, true, true, true, '2024-01-05', 34, 99),
('image', 'Tulio Syncro 36', 'Tulio — Tulio Syncro', '/photos/syncro/fly03536.webp', null, 'syncro', false, true, true, true, '2024-01-05', 35, 99),
('image', 'Tulio Syncro 37', 'Tulio — Tulio Syncro', '/photos/syncro/fly03541.webp', null, 'syncro', false, true, true, true, '2024-01-05', 36, 99),
('image', 'Tulio Syncro 38', 'Tulio — Tulio Syncro', '/photos/syncro/fly03542.webp', null, 'syncro', false, true, true, true, '2024-01-05', 37, 99),
('image', 'Tulio Syncro 39', 'Tulio — Tulio Syncro', '/photos/syncro/fly03549.webp', null, 'syncro', false, true, true, true, '2024-01-05', 38, 99),
('image', 'Tulio Syncro 40', 'Tulio — Tulio Syncro', '/photos/syncro/fly03552.webp', null, 'syncro', false, true, true, true, '2024-01-05', 39, 99),
('video', 'Tulio 01', 'Tulio — vídeo 01', '/videos/tulio-01.mp4', '/videos/posters/tulio-01.webp', null, false, true, false, true, null, 0, 0),
('video', 'Tulio 02', 'Tulio — vídeo 02', '/videos/tulio-02.mp4', '/videos/posters/tulio-02.webp', null, false, true, false, true, null, 1, 0),
('video', 'Tulio 03', 'Tulio — vídeo 03', '/videos/tulio-03.mp4', '/videos/posters/tulio-03.webp', null, false, true, false, true, null, 2, 0),
('video', 'Tulio 04', 'Tulio — vídeo 04', '/videos/tulio-04.mp4', '/videos/posters/tulio-04.webp', null, false, true, false, true, null, 3, 0),
('video', 'Tulio 05', 'Tulio — vídeo 05', '/videos/tulio-05.mp4', '/videos/posters/tulio-05.webp', null, false, true, false, true, null, 4, 0),
('video', 'Tulio 06', 'Tulio — vídeo 06', '/videos/tulio-06.mp4', '/videos/posters/tulio-06.webp', null, false, true, false, true, null, 5, 0),
('video', 'Tulio 07', 'Tulio — vídeo 07', '/videos/tulio-07.mp4', '/videos/posters/tulio-07.webp', null, false, true, false, true, null, 6, 0),
('video', 'Tulio 08', 'Tulio — vídeo 08', '/videos/tulio-08.mp4', '/videos/posters/tulio-08.webp', null, false, true, false, true, null, 7, 0),
('video', 'Tulio 09', 'Tulio — vídeo 09', '/videos/tulio-09.mp4', '/videos/posters/tulio-09.webp', null, false, true, false, true, null, 8, 0)
on conflict (public_url) do nothing;
