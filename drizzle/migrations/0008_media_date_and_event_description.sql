ALTER TABLE public.upcoming_dates ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.media ADD COLUMN IF NOT EXISTS captured_at date;
