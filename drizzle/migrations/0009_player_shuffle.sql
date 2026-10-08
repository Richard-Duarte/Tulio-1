ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS player_shuffle boolean NOT NULL DEFAULT false;
