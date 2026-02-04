-- Prevent banned users from updating their own profile

DROP POLICY IF EXISTS "Users can update own profile (non-role fields)" ON public.profiles;
CREATE POLICY "Users can update own profile (non-role fields)"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_banned = true
    )
  )
  WITH CHECK (
    auth.uid() = id
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_banned = true
    )
  );
