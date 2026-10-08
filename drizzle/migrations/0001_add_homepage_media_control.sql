ALTER TABLE public.media
ADD COLUMN homepage_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.media.homepage_enabled IS 'Controls whether this media item appears in the homepage session 1 tunnel.';