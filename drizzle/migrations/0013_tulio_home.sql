-- Tulio homepage opening. Kept off site_settings so the shared row is left alone.
CREATE TABLE public.tulio_home (
  singleton_key text PRIMARY KEY DEFAULT 'main',
  section1_image_url text,
  section1_image_alt text,
  booking_email text,
  facebook_url text,
  x_url text,
  tiktok_url text,
  youtube_url text,
  soundcloud_url text,
  bandcamp_url text,
  instagram_url text,
  spotify_url text,
  beatport_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.tulio_home (
  singleton_key,
  section1_image_url,
  section1_image_alt,
  booking_email,
  instagram_url,
  soundcloud_url
) VALUES (
  'main',
  '/brand/tulio-session.jpg',
  'Tulio no set',
  'soniccdrivebookings@gmail.com',
  'https://www.instagram.com/tulio.music/',
  'https://soundcloud.com/tuliomusic'
);

GRANT SELECT ON public.tulio_home TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tulio_home TO authenticated;
GRANT ALL ON public.tulio_home TO service_role;

ALTER TABLE public.tulio_home ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads tulio home" ON public.tulio_home
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage tulio home" ON public.tulio_home
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
