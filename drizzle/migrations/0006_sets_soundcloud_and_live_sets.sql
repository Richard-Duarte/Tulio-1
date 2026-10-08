-- Sets: dedicated SoundCloud link (autofill + embed). `played_at` (date) stays the editable set date
-- and drives public ordering (oldest -> newest).
ALTER TABLE public.sets
  ADD COLUMN IF NOT EXISTS soundcloud_url text;

CREATE UNIQUE INDEX IF NOT EXISTS sets_soundcloud_url_key ON public.sets (soundcloud_url);
CREATE INDEX IF NOT EXISTS sets_public_order_idx ON public.sets (published, played_at, created_at);

COMMENT ON COLUMN public.sets.soundcloud_url IS 'Canonical SoundCloud track URL (no tracking params). Used for autofill and the embedded player.';
COMMENT ON COLUMN public.sets.played_at IS 'Set date (editable). Public pages order by this ascending, nulls last.';

-- Seed JULA's SoundCloud sets (titles exactly as on SoundCloud). Idempotent: keyed on soundcloud_url,
-- existing rows (possibly edited in the admin) are left untouched.
INSERT INTO public.sets (title, description, cover_url, soundcloud_url, played_at, duration_seconds, sort_order, published)
VALUES
  ('After Session #002 - techno', NULL, 'https://i1.sndcdn.com/artworks-osoBxctUsbNRi2K8-9IQACw-t500x500.jpg', 'https://soundcloud.com/juliann-spercel/after-session-002-techno', '2022-12-05', 3760, 1, true),
  ('Testando', NULL, 'https://i1.sndcdn.com/artworks-IlamC1VKejTq4XCJ-6BnC4g-t500x500.jpg', 'https://soundcloud.com/juliann-spercel/so-um-teste', '2023-04-15', 3644, 2, true),
  ('Psycho Bunny', NULL, 'https://i1.sndcdn.com/artworks-nOkK6XZOtK9K3tNF-3UZ8SA-t500x500.jpg', 'https://soundcloud.com/juliann-spercel/aud-20231118-wa0000-m4a', '2023-11-18', 3701, 3, true),
  ('Universo Paralello Festival #17 - 2023/2024 - Sinkrö', 'DJ set Universo Paralello #17 2023/2024.', 'https://i1.sndcdn.com/artworks-SdScUNDZLZ4uYeFa-zykZPw-t500x500.jpg', 'https://soundcloud.com/juliann-spercel/universo-paralello-17-20232024-jula', '2024-02-21', 5595, 4, true),
  ('Ry-Ut Rhythm - RECORDED LIVE @ SUPERAFTER D-EDGE FEBUARY 2ND 2025', NULL, 'https://i1.sndcdn.com/artworks-AFND6J710i6lwgTu-upmt4A-t500x500.jpg', 'https://soundcloud.com/juliann-spercel/jula-b2b-kitamura-recorded-live-superafter-d-edge-febuary-2nd-2025', '2025-02-02', 9123, 5, true),
  ('JULA SUPERAFTER JAN 25TH 2026 | 9:30am - 12:20am', 'House - Deep Tech - Electro', 'https://i1.sndcdn.com/artworks-xqnM5pjMatzgT0GQ-wDrNiw-t500x500.jpg', 'https://soundcloud.com/juliann-spercel/jula-superater-jan-25th-2026', '2026-01-25', 10217, 6, true),
  ('RECORDED LIVE  NAVE D-EDGE APRIL 18TH 2026', NULL, 'https://i1.sndcdn.com/artworks-N1O8FOpqAJmktEAg-2ezdKg-t500x500.jpg', 'https://soundcloud.com/juliann-spercel/recorded-live-nave-d-edge', '2026-04-18', 8977, 7, true),
  ('Untitled 4', NULL, 'https://i1.sndcdn.com/avatars-2VLXjDoOtbUzqgCS-bfzD3w-t500x500.jpg', 'https://soundcloud.com/juliann-spercel/untitled-4', '2026-05-27', 338, 8, true),
  ('BDAY SET @ D-EDGE SP JULY 18TH 2026 - WARM UP', NULL, 'https://i1.sndcdn.com/artworks-gD0qhTYy8gLvi3d5-WMFxTA-t500x500.jpg', 'https://soundcloud.com/juliann-spercel/bday-set-d-edge-sp-july-18th', '2026-07-18', 7310, 9, true)
ON CONFLICT (soundcloud_url) DO NOTHING;

-- Live Sets: recorded sets published as YouTube videos.
CREATE TABLE IF NOT EXISTS public.live_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  youtube_url text NOT NULL,
  youtube_id text NOT NULL UNIQUE,
  cover_url text,
  set_date date,
  description text,
  duration_seconds integer,
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.live_sets TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.live_sets TO authenticated;
GRANT ALL ON public.live_sets TO service_role;

ALTER TABLE public.live_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads published live sets" ON public.live_sets;
CREATE POLICY "Public reads published live sets" ON public.live_sets
  FOR SELECT TO anon, authenticated USING (published = true);
DROP POLICY IF EXISTS "Admins manage live sets" ON public.live_sets;
CREATE POLICY "Admins manage live sets" ON public.live_sets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS live_sets_public_order_idx ON public.live_sets (published, set_date, created_at);
