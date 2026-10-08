ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS sets_shuffle boolean NOT NULL DEFAULT false;
