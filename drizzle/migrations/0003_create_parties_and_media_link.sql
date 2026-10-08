CREATE TABLE public.parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  happened_at date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.parties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parties TO authenticated;
GRANT ALL ON public.parties TO service_role;

ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads parties" ON public.parties FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage parties" ON public.parties FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.media ADD COLUMN party_id uuid REFERENCES public.parties(id) ON DELETE SET NULL;
