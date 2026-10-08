CREATE TABLE public.upcoming_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_date date NOT NULL,
  event_time time,
  venue text,
  city text,
  ticket_url text,
  ticket_image_url text,
  image_url text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT upcoming_dates_ticket_url_http CHECK (ticket_url IS NULL OR ticket_url ~* '^https?://'),
  CONSTRAINT upcoming_dates_ticket_image_url_http CHECK (ticket_image_url IS NULL OR ticket_image_url ~* '^https?://'),
  CONSTRAINT upcoming_dates_image_url_http CHECK (image_url IS NULL OR image_url ~* '^https?://')
);

CREATE INDEX upcoming_dates_published_date_idx ON public.upcoming_dates (published, event_date);

GRANT SELECT ON public.upcoming_dates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.upcoming_dates TO authenticated;
GRANT ALL ON public.upcoming_dates TO service_role;

ALTER TABLE public.upcoming_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads published upcoming dates" ON public.upcoming_dates
  FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "Admins manage upcoming dates" ON public.upcoming_dates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
