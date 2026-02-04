-- Enforce bans in RLS policies by blocking banned users from write actions

-- Beverages
DROP POLICY IF EXISTS "Contributors can insert beverages" ON public.beverages;
CREATE POLICY "Contributors can insert beverages"
  ON public.beverages FOR INSERT
  WITH CHECK (
    public.get_user_role() IN ('contributor', 'editor', 'moderator', 'admin')
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_banned = true
    )
  );

DROP POLICY IF EXISTS "Contributors can update beverages" ON public.beverages;
CREATE POLICY "Contributors can update beverages"
  ON public.beverages FOR UPDATE
  USING (
    public.get_user_role() IN ('contributor', 'editor', 'moderator', 'admin')
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_banned = true
    )
  );

DROP POLICY IF EXISTS "Editors, moderators, and admins can delete beverages" ON public.beverages;
CREATE POLICY "Editors, moderators, and admins can delete beverages"
  ON public.beverages FOR DELETE
  USING (
    public.get_user_role() IN ('editor', 'moderator', 'admin')
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_banned = true
    )
  );

-- Beverage revisions
DROP POLICY IF EXISTS "Contributors can create revisions" ON public.beverage_revisions;
CREATE POLICY "Contributors can create revisions"
  ON public.beverage_revisions FOR INSERT
  WITH CHECK (
    public.get_user_role() IN ('contributor', 'editor', 'moderator', 'admin')
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_banned = true
    )
  );

-- Activity log
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_log;
CREATE POLICY "Authenticated users can insert activity logs"
  ON public.activity_log FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_banned = true
    )
  );

-- Beverage groups
DROP POLICY IF EXISTS "Moderators and admins can insert groups" ON public.beverage_groups;
CREATE POLICY "Moderators and admins can insert groups"
  ON public.beverage_groups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('moderator', 'admin')
      AND is_banned = false
    )
  );

DROP POLICY IF EXISTS "Moderators and admins can update groups" ON public.beverage_groups;
CREATE POLICY "Moderators and admins can update groups"
  ON public.beverage_groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('moderator', 'admin')
      AND is_banned = false
    )
  );

DROP POLICY IF EXISTS "Only admins can delete groups" ON public.beverage_groups;
CREATE POLICY "Only admins can delete groups"
  ON public.beverage_groups FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND is_banned = false
    )
  );

-- Profiles update (admins/moderators) must be unbanned
DROP POLICY IF EXISTS "Admins and moderators can update profiles" ON public.profiles;
CREATE POLICY "Admins and moderators can update profiles"
  ON public.profiles FOR UPDATE
  USING (
    public.get_user_role() IN ('moderator', 'admin')
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_banned = true
    )
  );

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    public.get_user_role() = 'admin'
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_banned = true
    )
  );
