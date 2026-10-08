CREATE POLICY "Public reads homepage media"
ON public.media
FOR SELECT
TO anon, authenticated
USING (homepage_enabled = true);