-- Allow editors and moderators to delete beverages (alongside admins)

DROP POLICY IF EXISTS "Only admins can delete beverages" ON public.beverages;

CREATE POLICY "Editors, moderators, and admins can delete beverages"
  ON public.beverages FOR DELETE
  USING (public.get_user_role() IN ('editor', 'moderator', 'admin'));
