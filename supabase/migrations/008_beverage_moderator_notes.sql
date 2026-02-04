-- Add internal moderator notes for beverages

ALTER TABLE public.beverages
  ADD COLUMN IF NOT EXISTS moderator_notes TEXT;
