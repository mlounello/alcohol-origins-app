-- Add rejection workflow fields for beverages

ALTER TABLE public.beverages
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_beverages_rejected_by
  ON public.beverages(rejected_by);
