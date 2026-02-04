-- Add approval workflow fields for beverages

ALTER TABLE public.beverages
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_beverages_approval_status
  ON public.beverages(approval_status);

-- Update select policy to hide unapproved beverages from the public
DROP POLICY IF EXISTS "Beverages are viewable by everyone" ON public.beverages;

CREATE POLICY "Approved beverages are viewable by everyone"
  ON public.beverages FOR SELECT
  USING (
    approval_status = 'approved'
    OR created_by = auth.uid()
    OR public.get_user_role() IN ('editor', 'moderator', 'admin')
  );
