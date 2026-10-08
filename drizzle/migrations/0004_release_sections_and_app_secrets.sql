CREATE TABLE public.release_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body text NOT NULL,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.release_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.release_sections TO authenticated;
GRANT ALL ON public.release_sections TO service_role;

ALTER TABLE public.release_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads release sections" ON public.release_sections
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage release sections" ON public.release_sections
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.app_secrets TO service_role;

ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;