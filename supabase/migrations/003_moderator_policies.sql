-- Migration: Update policies to include moderator role
-- ============================================
-- NOTE: Run this AFTER 002_add_moderator_enum.sql has been committed

-- Change default role from 'contributor' to 'viewer'
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'viewer';

-- Update RLS policies to include moderator role

-- Drop existing policies that need updating
DROP POLICY IF EXISTS "Contributors can insert beverages" ON public.beverages;
DROP POLICY IF EXISTS "Contributors can update beverages" ON public.beverages;
DROP POLICY IF EXISTS "Contributors can create revisions" ON public.beverage_revisions;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Recreate policies with moderator included
CREATE POLICY "Contributors can insert beverages"
  ON public.beverages FOR INSERT
  WITH CHECK (public.get_user_role() IN ('contributor', 'editor', 'moderator', 'admin'));

CREATE POLICY "Contributors can update beverages"
  ON public.beverages FOR UPDATE
  USING (public.get_user_role() IN ('contributor', 'editor', 'moderator', 'admin'));

CREATE POLICY "Contributors can create revisions"
  ON public.beverage_revisions FOR INSERT
  WITH CHECK (public.get_user_role() IN ('contributor', 'editor', 'moderator', 'admin'));

-- Admins and moderators can update profiles
CREATE POLICY "Admins and moderators can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.get_user_role() IN ('moderator', 'admin'));

-- Add is_locked field to beverages if not exists (for locking entries)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'beverages' AND column_name = 'is_locked')
  THEN
    ALTER TABLE public.beverages ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
